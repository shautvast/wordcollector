import $ from 'jquery';
import '../css/style.css';
import {fabric} from 'fabric';
import data from '../data/wordcombis6.json';

new function () {
    const characterTiles = document.getElementsByClassName('tile'); //

    let lines = []; //lines connecting the letters
    let activeLine; //the line that moves with the pointer
    let screenMiddle;
    let words, // the words to guess
        characters, // the letters to choose from
        guess = "", // the current guess
        points = 0;
    const canvas = new fabric.Canvas('canvas', {selection: false});

    resize();
    registerEvents();
    start();

    function start() {
        // get new word
        let challenge = data[Math.floor(Math.random() * data.length)];
        words = challenge.words;

        // max ten words to guess
        // TODO put the rest in the extra-word list for bonus points
        // TODO make sure words of all lengths are guaranteed to be in the list
        while (words.length > 10) {
            words.splice(Math.random() * Math.floor(words.length), 1);
        }

        showEmptySlots(); // this is where the guessed words appear

        characters = shuffleLetters(challenge.chars); // random order, otherwise the longest word is to easily visible
        layoutLetterTiles(); // put them on screen
    }

    // boxes for the guessed words
    // TODO nice columnar layout
    function showEmptySlots() {
        let slots = $("#slots");
        slots.children().remove();

        for (let i = words.length - 1; i >= 0; i--) {
            let word = words[i];
            let wordSlot = $("<div class='wordslot hidden' id='" + word + "'>");
            slots.append(wordSlot);

            for (let j = 0; j < word.length; j++) {
                wordSlot.append($("<div class='characterslot'>").append(word.charAt(j).toUpperCase()));
            }
        }
    }

    // put all letter tiles in a nice circle
    function layoutLetterTiles() {
        let width = $(window).width();
        let height = $(window).height();
        let center_x = width / 2.4;
        let center_y = height / 2.2;

        let angleBetweenChars = 2 * Math.PI / characters.length;

        //remove any characters that were there before
        $("#characters div").remove();

        // layout new ones in a circle
        for (let i = 0; i < characters.length; i++) {
            let radius_x = Math.min((width / 4), 150); // not too wide on big screens

            let x = center_x - radius_x * Math.cos(i * angleBetweenChars) + Math.random();
            let y = center_y * 1.5 - (height / 6) * Math.sin(i * angleBetweenChars) + Math.random() * 20 - 20;

            // make visible
            let span = $("<span class='character-tile' id='" + i + "-" + characters[i] + "'>");
            span.append(characters[i].toUpperCase());
            let div = $("<div class='tile' style='top:" + y + "px;left:" + x + "px;transform: rotate(" + (Math.random() * 8 - 4) + "deg)'>");
            div.append(span);
            $("#characters").append(div);
        }
    }

    function registerEvents() {
        $(window).resize(function () {
            layoutLetterTiles();
        });

        canvas.on('mouse:down', event => {
            if (!activeLine) {
                addLineToCanvas(event);
                updatePointer(event);
            } else {
                reset();
            }
        });

        canvas.on('mouse:up', () => {
            checkGuess();
            reset();
        });

        canvas.on('mouse:move', updatePointer);

        $("#reload").on("click", () => {
            characters = shuffleLetters(characters);
            layoutLetterTiles();
        });

        $("#hint").on("click", () => {
            showHint();
        });
    }

    function checkGuess() {
        if (guess.length > 0) {
            // if the guess is correct, the word will light up
            $("#" + guess).attr("class", "wordslot revealed");

            // check if all words are found
            for (let i = 0; i < words.length; i++) {
                if (guess === words[i]) {

                    //update points
                    points += guess.length;
                    $("#points").text(points);

                    //remove word from words to guess
                    words.splice(words.indexOf(guess), 1);
                    if (words.length === 0) {
                        start(); //restart
                    }
                }
            }
        }
    }

    function updatePointer(event) {
        if (activeLine) {
            let pointer = canvas.getPointer(event.e, false);

            //move current line to mouse pointer
            activeLine.set({x2: pointer.x, y2: pointer.y});

            // check for hits
            for (let ix = 0; ix < characterTiles.length; ix++) {
                let tile = characterTiles[ix];
                if (isHit(tile, pointer)) {
                    registerHit(tile, event);
                }
            }
        }
        canvas.renderAll();
    }

    function addLineToCanvas(event) {
        let points = [event.e.layerX, event.e.layerY, event.e.layerX, event.e.layerY];
        let line = new fabric.Line(points, {
            strokeWidth: 4,
            stroke: '#ffffff',
            opacity: 0.5,
            hasBorders: false,
            hasControls: false,
            selectable: false,
            evented: false
        });

        activeLine = line; // the new line becomes the line that moves with the mouse/finger
        lines.push(line); // register, to be able to remove later

        canvas.add(line); // make visible on canvas
    }

    function reset() {
        // remove visible lines
        for (let i = 0; i < lines.length; i++) {
            canvas.remove(lines[i]);
        }

        // empty the lines in memory
        lines = [];

        // reset the activeline, so the gui goes into it's initial state
        activeLine = null;

        // reset all tiles
        for (let i = 0; i < characterTiles.length; i++) {
            characterTiles[i].setAttribute("class", "tile");
        }

        // reset guess
        let guessContainer = $("#guess");
        guessContainer.children().remove();
        guessContainer.attr("class", "guess");
        guess = "";
    }

    // simple collision detection
    function isHit(tile, pointer) {
        let tileX = parseInt(tile.style.left.valueOf());
        let tileY = parseInt(tile.style.top.valueOf());
        let dx = pointer.x - tileX;
        let dy = pointer.y + screenMiddle - tileY;

        return dx > 10 && dx < 80 && dy > 10 && dy < 80;
    }

    function registerHit(tile, event) {
        if (notHitAlready(tile)) {
            updateViewToSelected(tile);

            // create a new line from here
            addLineToCanvas(event);

            // extract the character on the selected tile
            let character = tile.firstChild.id.substring(2);

            // add it to the current guess
            guess = guess + character;

            // and update the guess view
            let guessContainer = $("#guess");
            let guessCharContainer = $("<span>");
            guessCharContainer.text(character.toUpperCase());
            guessCharContainer.appendTo(guessContainer);
            guessContainer.attr("class", "guess shown");

            // update guess view position on screen
            let newSize = ($(window).width() - 20) / 2 - guess.length * 17;
            guessContainer.css("left", newSize + "px");
        }
    }

    function updateViewToSelected(tile) {
        tile.setAttribute("class", "tile selected");
    }

    function notHitAlready(tile) {
        return tile.getAttribute("class") === "tile";
    }

    function resize() {
        canvas.setWidth($(window).width());
        screenMiddle = $(window).height() / 2;
        canvas.setHeight(screenMiddle);
    }

    function shuffleLetters(array) {
        let j, x;
        for (let i = array.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1));
            x = array[i];
            array[i] = array[j];
            array[j] = x;
        }
        return array;
    }

    function showHint() {
        let found = false;
        let count = 0; //100 tries
        while (!found && count++ < 100) {
            let word = words[Math.floor(Math.random() * words.length)];
            let letter = word[Math.floor(Math.random() * word.length)].toUpperCase();
            let slot = $("#" + word).children();

            for (let i = 0; i < word.length; i++) {
                if (slot[i].firstChild.nodeValue === letter && slot[i].getAttribute("class") === "characterslot") {
                    slot[i].setAttribute("class", "characterslot revealed");
                    found = true;
                    break;
                }
            }
        }
    }
}();

