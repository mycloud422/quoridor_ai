"use strict";

/*
* View part in the MVC pattern
*/
class View {
    constructor(controller, aiDevelopMode = false) {
        this.controller = controller;
        this.aiDevelopMode = aiDevelopMode;

        this._game = null;
        this.progressBarIntervalId = null;
        this.aiLevel = null;
        this.numOfMCTSSimulations = null;

        this.htmlBoardTable = document.getElementById("board_table");
        this.htmlPawns = [document.getElementById("pawn0"), document.getElementById("pawn1")];
        this.htmlMessageBox = document.getElementById("message_box");
        
        this.htmlAboutBox = document.getElementById("about_box");
        this.htmlChooseAILevelMessageBox = document.getElementById("choose_ai_level_message_box");
        this.htmlChoosePawnMessageBox = document.getElementById("choose_pawn_message_box");
        this.htmlRestartMessageBox = document.getElementById("restart_message_box");
        
        // for choosing AI level
        const aiLevelButton = {
            novice: document.getElementById("novice_level"),
            average: document.getElementById("average_level"),
            good: document.getElementById("good_level"),
            strong: document.getElementById("strong_level")
        }
        const onclickAILevelButton = function(e) {
            const x = e.target;
            if (x.id === "novice_level") {
                this.aiLevel = "Novice";
                this.numOfMCTSSimulations = 2500;
            } else if (x.id === "average_level") {
                this.aiLevel = "Average";
                this.numOfMCTSSimulations = 7500;
            } else if (x.id === "good_level") {
                this.aiLevel = "Good";
                this.numOfMCTSSimulations = 20000;
            } else if (x.id === "strong_level") {
                this.aiLevel = "Strong";
                this.numOfMCTSSimulations = 60000;
            } 
            Sound.select();
            this.htmlChooseAILevelMessageBox.classList.add("hidden");
            this.htmlChoosePawnMessageBox.classList.remove("hidden");
        };
        aiLevelButton.novice.onclick = onclickAILevelButton.bind(this);
        aiLevelButton.good.onclick = onclickAILevelButton.bind(this);
        aiLevelButton.strong.onclick = onclickAILevelButton.bind(this);
        aiLevelButton.average.onclick = onclickAILevelButton.bind(this);

        // for choosing pawn
        const pawn0Button = document.getElementsByClassName("pawn pawn0 button")[0];
        const pawn1Button = document.getElementsByClassName("pawn pawn1 button")[0];
        const onclickPawnButton = function(e) {
            const x = e.target;
            Sound.select();
            if (x.classList.contains("pawn0")) {
                this.startNewGame(true, this.numOfMCTSSimulations);
            } else if (x.classList.contains("pawn1")) {
                this.startNewGame(false, this.numOfMCTSSimulations);
            }
        };
        pawn0Button.onclick = onclickPawnButton.bind(this);
        pawn1Button.onclick = onclickPawnButton.bind(this);

        this.button = {
            confirm: document.getElementById("confirm_button"),
            cancel: document.getElementById("cancel_button"),
            undo: document.getElementById("undo_button"),
            redo: document.getElementById("redo_button"),
            aiDo: document.getElementById("aido_button")
        };
        this.button.confirm.disabled = true;
        this.button.cancel.disabled = true;
        this.button.undo.disabled = true;
        this.button.redo.disabled = true;
        this.button.aiDo.disabled = true;
        
        const onclickUndoButton = function(e) {
            this.button.undo.disabled = true;
            this.button.redo.disabled = true;
            this.button.aiDo.disabled = true;
            this.button.confirm.disabled = true;
            this.button.cancel.disabled = true;
            View.removePreviousFadeInoutBox();
            View.cancelPawnClick();
            View.cancelWallShadows();
            Sound.undo();
            this.controller.undo();
        };
        this.button.undo.onclick = onclickUndoButton.bind(this);

        const onclickRedoButton = function(e) {
            this.button.redo.disabled = true;
            this.button.undo.disabled = true;
            this.button.aiDo.disabled = true;
            this.button.confirm.disabled = true;
            this.button.cancel.disabled = true;
            View.cancelPawnClick();
            View.cancelWallShadows();
            Sound.redo();
            this.controller.redo();
        }
        this.button.redo.onclick = onclickRedoButton.bind(this);

        // Note: the "new game" button was removed from the top-left. New game
        // is now only accessible via the ESC pause overlay's "new game" button.

        const restartYesNoButton = {
            yes: document.getElementById("restart_yes"),
            no: document.getElementById("restart_no")
        }
        const onclickRestartYesNoButton = function(e) {
            const x = e.target;
            Sound.click();
            this.htmlRestartMessageBox.classList.add("hidden");
            if (x.id === "restart_yes") {
                this.htmlChooseModeMessageBox.classList.remove("hidden");
            } else {
                this.enableUndoRedoButtonIfNecessary();
            }
        }
        restartYesNoButton.yes.onclick = onclickRestartYesNoButton.bind(this);
        restartYesNoButton.no.onclick = onclickRestartYesNoButton.bind(this);

        // Mode picker (vs AI / 2 players)
        this.htmlChooseModeMessageBox = document.getElementById("choose_mode_message_box");
        const modeAIButton = document.getElementById("mode_ai");
        const mode2PButton = document.getElementById("mode_2p");
        const onclickModeButton = function(e) {
            const x = e.target;
            Sound.click();
            this.htmlChooseModeMessageBox.classList.add("hidden");
            if (x.id === "mode_ai") {
                // Proceed to AI level picker
                this.htmlChooseAILevelMessageBox.classList.remove("hidden");
            } else if (x.id === "mode_2p") {
                // Start a 2-player local game immediately (pawn0 = white moves first)
                this.startNewGame2P();
            }
        };
        modeAIButton.onclick = onclickModeButton.bind(this);
        mode2PButton.onclick = onclickModeButton.bind(this);
        
        const onclickAboutButton = function(e) {
            if (this.htmlAboutBox.classList.contains("hidden")) {
                Sound.click();
                this.button.undo.disabled = true;
                this.button.redo.disabled = true;
                View.removePreviousFadeInoutBox();
                this.htmlRestartMessageBox.classList.add("hidden");
                this.htmlChooseAILevelMessageBox.classList.add("hidden");
                this.htmlChoosePawnMessageBox.classList.add("hidden");
                this.htmlAboutBox.classList.remove("hidden");
            } else {
                Sound.click();
                this.htmlAboutBox.classList.add("hidden");
                this.enableUndoRedoButtonIfNecessary();
            }
        }
        const aboutButton = document.getElementById("about_button");
        aboutButton.onclick = onclickAboutButton.bind(this);

        const onclickCloseButtonInAbout = function(e) {
            Sound.click();
            this.htmlAboutBox.classList.add("hidden");
            this.enableUndoRedoButtonIfNecessary();
        }
        const onclickCloseButtonInAboutFirst = function(e) {
            Sound.click();
            this.htmlAboutBox.classList.add("hidden");
            this.htmlChooseModeMessageBox.classList.remove("hidden");
            closeButtonInAbout.onclick = onclickCloseButtonInAbout.bind(this);
        }
        const closeButtonInAbout = document.getElementById("about_close_button");
        closeButtonInAbout.onclick = onclickCloseButtonInAboutFirst.bind(this);

        if (this.aiDevelopMode) {
            const onclickAiDoButton = function(e) {
                this._removePreviousRender();
                this.button.aiDo.disabled = true;
                this.button.confirm.disabled = true;
                this.button.cancel.disabled = true;
                View.cancelPawnClick();
                View.cancelWallShadows();
                this.controller.aiDo();
            };
            this.button.aiDo.onclick = onclickAiDoButton.bind(this);
            this.button.aiDo.classList.remove("hidden");
        }

        const htmlConfirmButtonStyle = window.getComputedStyle(this.button.confirm);
        // decide whether it is touch device or not, this display attribute is under css media query.
        this.isHoverPossible = (htmlConfirmButtonStyle.display === "none");

        // set UI for touch device
        if (!this.isHoverPossible) {
            this.setUIForTouchDevice();
        }

        this._setupKeyboardShortcuts();
        this._setupPauseOverlay();
    }

    // ===================================================================
    // Keyboard shortcuts: WASD movement, Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z redo, ESC pause
    // ===================================================================
    _setupKeyboardShortcuts() {
        document.addEventListener("keydown", (e) => {
            // Cmd/Ctrl+Z = undo, Cmd/Ctrl+Shift+Z = redo (also Cmd/Ctrl+Y as fallback)
            const mod = e.metaKey || e.ctrlKey;
            if (mod && (e.key === "z" || e.key === "Z" || e.key === "y" || e.key === "Y")) {
                e.preventDefault();
                const isRedo = e.shiftKey || e.key === "y" || e.key === "Y";
                if (isRedo) {
                    if (!this.button.redo.disabled) {
                        this.button.redo.click();
                    }
                } else {
                    if (!this.button.undo.disabled) {
                        this.button.undo.click();
                    }
                }
                return;
            }

            // ESC = pause / resume (only meaningful once a game has started)
            if (e.key === "Escape") {
                const gameInProgress = this.controller && this.controller.game
                    && this.controller.game.winner === null;
                if (gameInProgress) {
                    e.preventDefault();
                    if (this._isPaused) {
                        this.resumeGame();
                    } else {
                        this.pauseGame();
                    }
                }
                return;
            }

            // WASD movement — only on human turn, no overlay open, not paused
            if (!this._isPauseAllowed() || this._isPaused) return;
            const key = e.key.toLowerCase();
            const moveMap = { "w": [-1, 0], "s": [1, 0], "a": [0, -1], "d": [0, 1] };
            if (!(key in moveMap)) return;
            // Don't trap WASD when the user is typing in an input
            if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;

            const game = this.controller.game;
            if (!game || game.winner !== null) return;
            if (!game.pawnOfTurn.isHumanPlayer) return;

            const delta = moveMap[key];
            const cur = game.pawnOfTurn.position;
            const targetRow = cur.row + delta[0];
            const targetCol = cur.col + delta[1];

            // Bounds check
            if (targetRow < 0 || targetRow > 8 || targetCol < 0 || targetCol > 8) return;

            // Validity check — Quoridor rules (including jumps) are encoded in validNextPositions
            if (!game.validNextPositions[targetRow][targetCol]) return;

            e.preventDefault();
            // Sound is played by controller.doMove() after the move succeeds
            this.controller.doMove([[targetRow, targetCol], null, null]);
        });
    }

    // Returns true iff a game is in progress and no overlay is currently blocking input.
    _isPauseAllowed() {
        if (!this.controller || !this.controller.game) return false;
        if (this.controller.game.winner !== null) return false;
        // If any fade_box overlay is visible, the board is occluded — don't allow WASD
        const visibleOverlays = document.querySelectorAll(".fade_box.in:not(.hidden)");
        return visibleOverlays.length === 0;
    }

    // ===================================================================
    // Pause overlay
    // ===================================================================
    _setupPauseOverlay() {
        this._isPaused = false;
        this.htmlPauseMessageBox = document.getElementById("pause_message_box");
        this.htmlPauseAILevelDesc = document.getElementById("pause_ai_level_desc");

        const resumeBtn = document.getElementById("pause_resume");
        const newGameBtn = document.getElementById("pause_new_game");

        resumeBtn.addEventListener("click", () => this.resumeGame());
        newGameBtn.addEventListener("click", () => {
            Sound.click();
            this.htmlPauseMessageBox.classList.add("hidden");
            this._isPaused = false;
            // Kick off the new-game flow → mode picker → (AI level picker → pawn picker) OR (2P direct)
            this.button.undo.disabled = true;
            this.button.redo.disabled = true;
            this.button.aiDo.disabled = true;
            View.removePreviousFadeInoutBox();
            this.htmlAboutBox.classList.add("hidden");
            this.htmlChoosePawnMessageBox.classList.add("hidden");
            this.htmlChooseAILevelMessageBox.classList.add("hidden");
            this.htmlChooseModeMessageBox.classList.remove("hidden");
        });
    }

    pauseGame() {
        if (!this._isPauseAllowed() || this._isPaused) return;
        this._isPaused = true;
        Sound.pause();
        if (this.gameMode === '2p') {
            this.htmlPauseAILevelDesc.textContent = "mode: 2 players";
        } else if (this.aiLevel) {
            this.htmlPauseAILevelDesc.textContent = "AI level: " + this.aiLevel;
        } else {
            this.htmlPauseAILevelDesc.textContent = "";
        }
        // Hide any other overlays first to avoid stacking
        this.htmlAboutBox.classList.add("hidden");
        this.htmlChooseAILevelMessageBox.classList.add("hidden");
        this.htmlChoosePawnMessageBox.classList.add("hidden");
        this.htmlRestartMessageBox.classList.add("hidden");
        this.htmlPauseMessageBox.classList.remove("hidden");
    }

    resumeGame() {
        if (!this._isPaused) return;
        this._isPaused = false;
        Sound.resume();
        this.htmlPauseMessageBox.classList.add("hidden");
        this.enableUndoRedoButtonIfNecessary();
    }

    set game(game) {
        this._game = game;

        View.removeWalls();
        this.htmlPawns[0].classList.remove("hidden");
        this.htmlPawns[1].classList.remove("hidden");

        // initialize number of left walls box
        let symbolPawnList = document.getElementsByClassName("pawn symbol");
        let wallNumList = document.getElementsByClassName("wall_num");
        if (this.game.board.pawns[0].goalRow === 8) {
            symbolPawnList[0].classList.remove("pawn1");
            wallNumList[0].classList.remove("pawn1");
            symbolPawnList[0].classList.add("pawn0");
            wallNumList[0].classList.add("pawn0");

            symbolPawnList[1].classList.remove("pawn0");
            wallNumList[1].classList.remove("pawn0");
            symbolPawnList[1].classList.add("pawn1");
            wallNumList[1].classList.add("pawn1");
            this.htmlWallNum = {pawn0: wallNumList[0], pawn1: wallNumList[1]};
        } else {
            symbolPawnList[0].classList.remove("pawn0");
            wallNumList[0].classList.remove("pawn0");
            symbolPawnList[0].classList.add("pawn1");
            wallNumList[0].classList.add("pawn1");

            symbolPawnList[1].classList.remove("pawn1");
            wallNumList[1].classList.remove("pawn1");
            symbolPawnList[1].classList.add("pawn0");
            wallNumList[1].classList.add("pawn0");
            this.htmlWallNum = {pawn0: wallNumList[1], pawn1: wallNumList[0]};
        }
    }
    get game() {
        return this._game;
    }
    
    setUIForTouchDevice() {
        const onclickConfirmButton = function(e) {
            this.button.confirm.disabled = true;
            this.button.cancel.disabled = true;
            const clickedPawns = document.getElementsByClassName("pawn clicked");
            if (clickedPawns.length > 0) {
                const clickedPawn = clickedPawns[0];
                const row = clickedPawn.parentElement.parentElement.rowIndex / 2;
                const col = clickedPawn.parentElement.cellIndex / 2;
                View.cancelPawnClick();
                // Sound is played by controller.doMove() after the move succeeds
                this.controller.doMove([[row, col], null, null]);
            } else {
                const horizontalWallShadows = document.getElementsByClassName("horizontal_wall shadow");
                const verticalWallShadows = document.getElementsByClassName("vertical_wall shadow");
                if (horizontalWallShadows.length > 0) {
                    const horizontalWallShadow = horizontalWallShadows[0];
                    const row = (horizontalWallShadow.parentElement.parentElement.rowIndex - 1) / 2;
                    const col = horizontalWallShadow.parentElement.cellIndex / 2;
                    View.cancelWallShadows();
                    // Sound is played by controller.doMove() after the move succeeds
                    this.controller.doMove([null, [row, col], null]);
                } else if (verticalWallShadows.length > 0) {
                    const verticalWallShadow = verticalWallShadows[0];
                    const row = verticalWallShadow.parentElement.parentElement.rowIndex / 2;
                    const col = (verticalWallShadow.parentElement.cellIndex - 1) / 2;
                    View.cancelWallShadows();
                    // Sound is played by controller.doMove() after the move succeeds
                    this.controller.doMove([null, null, [row, col]]);
                }
            }
        };
        const onclickCancelButton = function(e) {
            Sound.click();
            this.button.confirm.disabled = true;
            this.button.cancel.disabled = true;
            View.cancelPawnClick();
            View.cancelWallShadows();
        };
        
        this.button.confirm.onclick = onclickConfirmButton.bind(this);
        this.button.cancel.onclick = onclickCancelButton.bind(this);
    }

    startNewGame(isHumanPlayerFirst, numOfMCTSSimulations) {
        this.htmlChoosePawnMessageBox.classList.add("hidden");
        Sound.newGame();
        this.gameMode = 'ai';
        this.controller.startNewGame(isHumanPlayerFirst, numOfMCTSSimulations);
    }

    // Start a local 2-player game. Both pawns are human-controlled; turns
    // alternate between them. No AI, no MCTS, no worker.
    startNewGame2P() {
        Sound.newGame();
        this.gameMode = '2p';
        this.aiLevel = null;  // no AI level in 2P mode
        this.controller.startNewGame2P();
    }

    printMessage(message) {
        let textNode;
        for (let i = 0; i < this.htmlMessageBox.childNodes.length; i++) {
            if (this.htmlMessageBox.childNodes[i].nodeType === Node.TEXT_NODE) {
                textNode = this.htmlMessageBox.childNodes[i];
                break;
            }
        }
        textNode.nodeValue = message;
    }

    printImpossibleWallMessage() {
        Sound.invalid();
        View.removePreviousFadeInoutBox();
        const box = document.createElement("div");
        box.classList.add("fade_box")
        box.classList.add("inout");
        box.id = "note_message_box";
        box.innerHTML = "There must remain at least one path to the goal for each pawn.";
        const boardTableContainer = document.getElementById("board_table_container");
        boardTableContainer.appendChild(box);
    }

    printGameResultMessage(message) {
        View.removePreviousFadeInoutBox();
        const box = document.createElement("div");
        box.classList.add("fade_box")
        box.classList.add("inout");
        box.id = "game_result_message_box";
        box.innerHTML = message;
        const boardTableContainer = document.getElementById("board_table_container");
        boardTableContainer.appendChild(box);
    }

    render() {
        this._removePreviousRender();
        this._renderNumberOfLeftWalls();
        this._renderPawnPositions();
        this._renderWalls();
        if (this.game.winner !== null) {
            // Only play the win/lose sound once, when the game just ended.
            if (!this._winnerSoundPlayed) {
                this._winnerSoundPlayed = true;
                if (this.gameMode === '2p') {
                    // In 2P mode, "win" sound for either winner (someone just won)
                    Sound.win();
                } else if (this.game.winner.isHumanPlayer) {
                    Sound.win();
                } else {
                    Sound.lose();
                }
            }
            if (this.gameMode === '2p') {
                const winnerName = this.game.winner.index === 0 ? "White" : "Black";
                this.printGameResultMessage(winnerName + " wins!");
                this.printMessage(winnerName + " wins!");
            } else if (this.game.winner.isHumanPlayer) {
                this.printGameResultMessage("You win against " + this.aiLevel + " AI!");
                this.printMessage("You win!");
            } else {
                this.printGameResultMessage(this.aiLevel + " AI wins!");
                this.printMessage(this.aiLevel + " AI wins!");
            }
        } else {
            this._winnerSoundPlayed = false;
            if (this.game.pawnOfTurn.isHumanPlayer) {
                this._renderValidNextPawnPositions();
                this._renderValidNextWalls();
                if (this.gameMode === '2p') {
                    const turnName = this.game.pawnIndexOfTurn === 0 ? "White" : "Black";
                    this.printMessage(turnName + "'s turn");
                } else {
                    this.printMessage("Your turn");
                }
            } else {
                this.printMessage(this.aiLevel + " AI's turn");
            }

            if (this.aiDevelopMode) {
                this.button.aiDo.disabled = false;
            }
        }
        
        if (this.controller.gameHistory.length > 2) {
            this.button.undo.disabled = false;
        } else {
            this.button.undo.disabled = true;
        }
        
        if (this.controller.gameHistoryTrashCan.length > 0) {
            this.button.redo.disabled = false;
        } else {
            this.button.redo.disabled = true;
        }
    }

    _removePreviousRender() {
        for (let i = 0; i < this.htmlBoardTable.rows.length; i++) {
            for (let j = 0; j < this.htmlBoardTable.rows[0].cells.length; j++) {
                let element = this.htmlBoardTable.rows[i].cells[j];
                element.removeAttribute("onmouseenter");
                element.removeAttribute("onmouseleave");
                element.onclick = null;
            }
        }
        // remove pawn shadows which are for previous board
        let previousPawnShadows = document.getElementsByClassName("pawn shadow");
        while(previousPawnShadows.length !== 0) {
            previousPawnShadows[0].remove();
        }
    }

    _renderNumberOfLeftWalls() {
        this.htmlWallNum.pawn0.innerHTML = this.game.board.pawns[0].numberOfLeftWalls;
        this.htmlWallNum.pawn1.innerHTML = this.game.board.pawns[1].numberOfLeftWalls;
    }

    _renderPawnPositions() {
        this.htmlBoardTable.rows[this.game.board.pawns[0].position.row * 2].cells[this.game.board.pawns[0].position.col * 2].appendChild(this.htmlPawns[0]);
        this.htmlBoardTable.rows[this.game.board.pawns[1].position.row * 2].cells[this.game.board.pawns[1].position.col * 2].appendChild(this.htmlPawns[1]);
    }

    _renderValidNextPawnPositions() {
        let onclickNextPawnPosition;
        if (this.isHoverPossible) {
            onclickNextPawnPosition = function(e) {
                const x = e.target;
                const row = x.parentElement.parentElement.rowIndex / 2;
                const col = x.parentElement.cellIndex / 2;
                // Sound is played by controller.doMove() after the move succeeds
                this.controller.doMove([[row, col], null, null]);
            };
        } else {
            onclickNextPawnPosition = function(e) {
                View.cancelPawnClick();
                View.cancelWallShadows();
                const x = e.target;
                let pawnShadows = document.getElementsByClassName("pawn shadow");
                for (let i = 0; i < pawnShadows.length; i++) {
                    if (pawnShadows[i] !== x) {
                        pawnShadows[i].classList.add("hidden");
                    }
                }
                x.classList.add("clicked");
                Sound.click();
                this.button.confirm.disabled = false;
                this.button.cancel.disabled = false;
            };
        }
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (this.game.validNextPositions[i][j] === true) {
                    let element = this.htmlBoardTable.rows[i * 2].cells[j * 2];
                    let pawnShadow = document.createElement("div");
                    pawnShadow.classList.add("pawn");
                    pawnShadow.classList.add("pawn" + this.game.pawnIndexOfTurn);
                    pawnShadow.classList.add("shadow");
                    element.appendChild(pawnShadow);
                    pawnShadow.onclick = onclickNextPawnPosition.bind(this);
                }
            }
        }
    }

    _renderWalls() {
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if(this.game.board.walls.horizontal[i][j] === true) {
                    let horizontalWall = document.createElement("div");
                    horizontalWall.classList.add("horizontal_wall");
                    if (!this.htmlBoardTable.rows[i*2+1].cells[j*2].hasChildNodes()) {
                        this.htmlBoardTable.rows[i*2+1].cells[j*2].appendChild(horizontalWall);
                    }
                }
                if(this.game.board.walls.vertical[i][j] === true) {
                    let verticalWall = document.createElement("div");
                    verticalWall.classList.add("vertical_wall");
                    if (!this.htmlBoardTable.rows[i*2].cells[j*2+1].hasChildNodes()) {
                        this.htmlBoardTable.rows[i*2].cells[j*2+1].appendChild(verticalWall);
                    }
                }
            }
        }        
    }

    _renderValidNextWalls() {
        if (this.game.pawnOfTurn.numberOfLeftWalls <= 0) {
            return;
        }
        let onclickNextHorizontalWall, onclickNextVerticalWall;
        if (this.isHoverPossible) {
            onclickNextHorizontalWall = function(e) {
                const x = e.currentTarget;
                View.horizontalWallShadow(x, false);
                const row = (x.parentElement.rowIndex - 1) / 2;
                const col = x.cellIndex / 2;
                // Sound is played by controller.doMove() after the move succeeds
                this.controller.doMove([null, [row, col], null]);
            };
            onclickNextVerticalWall = function(e) {
                const x = e.currentTarget;
                View.verticalWallShadow(x, false);
                const row = x.parentElement.rowIndex / 2;
                const col = (x.cellIndex - 1) / 2;
                // Sound is played by controller.doMove() after the move succeeds
                this.controller.doMove([null, null, [row, col]]);
            };
        } else {
            onclickNextHorizontalWall = function(e) {
                View.cancelPawnClick();
                View.cancelWallShadows();
                const x = e.currentTarget;
                View.horizontalWallShadow(x, true);
                Sound.click();
                this.button.confirm.disabled = false;
                this.button.cancel.disabled = false;
            };
            onclickNextVerticalWall = function(e) {
                View.cancelPawnClick();
                View.cancelWallShadows();
                const x = e.currentTarget;
                View.verticalWallShadow(x, true);
                Sound.click();
                this.button.confirm.disabled = false;
                this.button.cancel.disabled = false;
            };
        }
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if (this.game.validNextWalls.horizontal[i][j] === true) {
                    let element = this.htmlBoardTable.rows[i * 2 + 1].cells[j * 2];
                    if (this.isHoverPossible) {
                        element.setAttribute("onmouseenter", "View.horizontalWallShadow(this, true)");
                        element.setAttribute("onmouseleave", "View.horizontalWallShadow(this, false)");
                    }                    
                    element.onclick = onclickNextHorizontalWall.bind(this);
                }
                if (this.game.validNextWalls.vertical[i][j] === true) {
                    let element = this.htmlBoardTable.rows[i * 2].cells[j * 2 + 1];
                    if (this.isHoverPossible) {
                        element.setAttribute("onmouseenter", "View.verticalWallShadow(this, true)");
                        element.setAttribute("onmouseleave", "View.verticalWallShadow(this, false)");
                    }
                    element.onclick = onclickNextVerticalWall.bind(this);
                }
            }
        }
    }

    // this is for debug or test
    render2DArrayToBoard(arr2D) {
        // remove texts printed before
        for (let i = 0; i < arr2D.length; i++) {
            for (let j = 0; j < arr2D[0].length; j++) {
                const cell = this.htmlBoardTable.rows[2*i].cells[2*j];
                if (cell.firstChild !== null && cell.firstChild.nodeType === Node.TEXT_NODE) {
                    cell.firstChild.remove();
                };
            }
        }

        if (arr2D.length === 9 && arr2D[0].length === 9) {
            for (let i = 0; i < arr2D.length; i++) {
                for (let j = 0; j < arr2D[0].length; j++) {
                    const textNode = document.createTextNode(arr2D[i][j])
                    const cell = this.htmlBoardTable.rows[2*i].cells[2*j];
                    cell.insertBefore(textNode, cell.firstChild);
                }
            }
        }
    }

    adjustProgressBar(percentage) {
        percentage = Math.round(percentage);
        const htmlProgressBar = document.getElementById("progress_bar");
        if (this.progressBarIntervalId !== null) {
            clearInterval(this.progressBarIntervalId);
            this.progressBarIntervalId = null;
        }
        let width = parseInt(htmlProgressBar.style.width, 10);
        if (width > percentage) {
            width = 0;
            htmlProgressBar.style.width = width + '%';
        }
        const frame = function() {
            if (width >= percentage) {
                clearInterval(this.progressBarIntervalId);
                this.progressBarIntervalId = null;
                if (percentage >= 100) {
                    width = 0;
                    htmlProgressBar.style.width = width + '%';
                }
            } else {
                width++;
                htmlProgressBar.style.width = width + '%'; 
            }
        }
        if (percentage >= 100) {
            this.progressBarIntervalId = setInterval(frame.bind(this), 1);
        } else {
            this.progressBarIntervalId = setInterval(frame.bind(this), 10);
        }
    }

    enableUndoRedoButtonIfNecessary() {
        const gameHistory = this.controller.gameHistory;
        if (gameHistory !== null && gameHistory.length > 2) {
            this.button.undo.disabled = false;
        }

        const gameHistoryTrashCan = this.controller.gameHistoryTrashCan;
        if (gameHistoryTrashCan !== null && gameHistoryTrashCan.length > 0) {
            this.button.redo.disabled = false;
        }
    }

    static horizontalWallShadow(x, turnOn) {
        if (turnOn === true) {
            const _horizontalWallShadow = document.createElement("div");
            _horizontalWallShadow.classList.add("horizontal_wall");
            _horizontalWallShadow.classList.add("shadow");
            x.appendChild(_horizontalWallShadow);
        } else {
            while (x.firstChild) {
                x.removeChild(x.firstChild);
            }  
        }
    }
    
    static verticalWallShadow(x, turnOn) {
        if (turnOn === true) {
            const _verticalWallShadow = document.createElement("div");
            _verticalWallShadow.classList.add("vertical_wall");
            _verticalWallShadow.classList.add("shadow");
            x.appendChild(_verticalWallShadow);
        } else {
            while (x.firstChild) {
                x.removeChild(x.firstChild);
            }
        }
   
    }

    static cancelWallShadows() {
        let previousWallShadows = document.getElementsByClassName("horizontal_wall shadow");
        while(previousWallShadows.length !== 0) {
            previousWallShadows[0].remove();
        }
        previousWallShadows = document.getElementsByClassName("vertical_wall shadow");
        while(previousWallShadows.length !== 0) {
            previousWallShadows[0].remove();
        }
    }
    
    static cancelPawnClick() {
        let pawnShadows = document.getElementsByClassName("pawn shadow");
        for (let i = 0; i < pawnShadows.length; i++) {
            pawnShadows[i].classList.remove("clicked");
            pawnShadows[i].classList.remove("hidden");
        }
    }

    static removePreviousFadeInoutBox() {
        let previousBoxes;
        if (previousBoxes = document.getElementsByClassName("fade_box inout")) {
            while(previousBoxes.length !== 0) {
                previousBoxes[0].remove();
            }
        }
    }

    static removeWalls() {
        let previousWalls = document.querySelectorAll("td > .horizontal_wall");
        for (let i = 0; i < previousWalls.length; i++) {
            previousWalls[i].remove();
        }
        previousWalls = document.querySelectorAll("td > .vertical_wall");
        for (let i = 0; i < previousWalls.length; i++) {
            previousWalls[i].remove();
        }
    }
}

