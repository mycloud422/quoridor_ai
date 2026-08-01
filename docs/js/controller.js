"use strict";

/*
* Controller part in the MVC pattern
*/
class Controller {
    constructor(uctConst, aiDevelopMode = false) {
        this.aiDevelopMode = aiDevelopMode;
        if (this.aiDevelopMode) {
            console.log('Welcome to AI Develop Mode!');
        }
        this.game = null;
        this.gameHistory = null;
        this.gameHistoryTrashCan = null;  // For Redo
        this.view = new View(this, this.aiDevelopMode);
        this.worker = null;
        this.numOfMCTSSimulations = null;
        this.uctConst = uctConst;
    }

    setNewWorker() {
        if (this.worker !== null) {
            this.worker.terminate();
            this.worker = null;
        }
        // Fallback: when loading the page from file:// (origin "null") or any
        // context where Web Workers are unavailable, run the AI synchronously
        // on the main thread. This keeps the game fully playable from a local
        // file without a server.
        this.workerFallback = false;
        try {
            this.worker = new Worker('js/worker.js');
        } catch (e) {
            console.warn('[Quoridor] Web Worker unavailable — falling back to main-thread AI. (' + e.message + ')');
            this.worker = null;
            this.workerFallback = true;
            return;
        }
        const onMessageFunc = function(event) {
            const data = event.data;
            if (typeof(data) === "number") {
                this.view.adjustProgressBar(data * 100);
            } else {
                const move = data;
                this.doMove(move);
            }
        }
        this.worker.onmessage = onMessageFunc.bind(this);
        this.worker.onerror = function(error) {
            console.log('Worker error: ' + error.message + '\n');
            throw error;
        };
    }

    // Main-thread AI fallback used when Web Workers are not available
    // (e.g. when the page is opened via file://). Mirrors what js/worker.js
    // would do, but runs synchronously on the main thread.
    runAIOnMainThread() {
        if (!this.game || this.game.winner !== null) return;
        // Show a full progress bar so the user sees something happening
        // while the synchronous MCTS runs.
        this.view.adjustProgressBar(100);
        try {
            // Defer the heavy compute by one tick so the browser can paint
            // the "AI's turn" message before the main thread blocks.
            setTimeout(() => {
                const ai = new AI(this.numOfMCTSSimulations, this.uctConst, this.aiDevelopMode, false);
                const move = ai.chooseNextMove(this.game);
                this.view.adjustProgressBar(0);
                this.doMove(move);
            }, 30);
        } catch (err) {
            console.error('[Quoridor] Main-thread AI failed:', err);
            this.view.adjustProgressBar(0);
        }
    }

    startNewGame(isHumanPlayerFirst, numOfMCTSSimulations) {
        this.gameMode = 'ai';
        this.numOfMCTSSimulations = numOfMCTSSimulations;
        this.setNewWorker();
        let game = new Game(isHumanPlayerFirst);
        this.game = game;
        this.gameHistory = [];
        this.gameHistoryTrashCan = [];
        if (this.aiDevelopMode) {
            this.game.board.pawns[0].isHumanPlayer = true;
            this.game.board.pawns[1].isHumanPlayer = true;
        }
        this.gameHistory.push(Game.clone(this.game));
        this.view.game = this.game;
        this.view.render();
        if (this.aiDevelopMode) {
            this.renderDistancesForAIDevelopMode();
        }
        if (!this.aiDevelopMode && !isHumanPlayerFirst) {
            this.aiDo();
        }
    }

    // Start a local 2-player game. Both pawns are human-controlled; turns
    // alternate. No AI worker is spawned, no MCTS runs. Pawn0 (light/white)
    // moves first by default.
    startNewGame2P() {
        this.gameMode = '2p';
        this.numOfMCTSSimulations = null;
        // No worker needed for 2P mode, but keep a null reference for safety
        if (this.worker !== null) {
            this.worker.terminate();
            this.worker = null;
        }
        this.workerFallback = false;
        // isHumanPlayerFirst=true → pawn0 (white) is the human side and moves first.
        // We then set BOTH pawns' isHumanPlayer=true so the controller never invokes the AI.
        let game = new Game(true);
        game.board.pawns[0].isHumanPlayer = true;
        game.board.pawns[1].isHumanPlayer = true;
        this.game = game;
        this.gameHistory = [];
        this.gameHistoryTrashCan = [];
        this.gameHistory.push(Game.clone(this.game));
        this.view.game = this.game;
        this.view.render();
    }

    doMove(move) {
        if (this.game.doMove(move, true)) {
            this.gameHistory.push(Game.clone(this.game));
            this.gameHistoryTrashCan = [];
            // Play sound based on what just happened.
            // After doMove(), pawnOfNotTurn is the pawn that just moved.
            if (typeof Sound !== 'undefined') {
                if (move[0]) {
                    // Pawn move
                    if (this.game.pawnOfNotTurn.isHumanPlayer) {
                        Sound.move();
                    } else {
                        Sound.aiMove();
                    }
                } else if (move[1] || move[2]) {
                    // Wall placement
                    if (this.game.pawnOfNotTurn.isHumanPlayer) {
                        Sound.wallPlace();
                    } else {
                        Sound.aiWallPlace();
                    }
                }
            }
            this.view.render();
            if (this.aiDevelopMode) {
                this.renderDistancesForAIDevelopMode();
            }
            if (!this.game.pawnOfTurn.isHumanPlayer) {
                this.aiDo();
            }
        } else {
            // suppose that pawnMove can not be return false, if make the View perfect.
            // so if doMove return false, it's from placeWalls.
            this.view.printImpossibleWallMessage();
        }
    }

    undo() {
        // Only (re)spawn the AI worker in AI mode — 2P mode has no AI
        if (this.gameMode !== '2p') {
            this.setNewWorker();
        }
        this.view.adjustProgressBar(0);

        // this pops and pushes current game state
        this.gameHistoryTrashCan.push(this.gameHistory.pop());

        let game = this.gameHistory.pop(); // this pops one-turn-before game state
        while (!game.pawnOfTurn.isHumanPlayer) {
            this.gameHistoryTrashCan.push(game);
            game = this.gameHistory.pop();  // this pops last game state
        }
        this.game = game;
        this.gameHistory.push(Game.clone(this.game));
        this.view.game = this.game;
        this.view.render();
    }

    redo() {
        if (this.gameHistoryTrashCan.length === 0) return;
        // Mirror undo(): keep popping until we reach a human-turn state,
        // so one redo restores what one undo rewound (human move + AI move pair).
        let game = this.gameHistoryTrashCan.pop();
        this.gameHistory.push(Game.clone(game));
        if (!this.aiDevelopMode) {
            while (game && !game.pawnOfTurn.isHumanPlayer && this.gameHistoryTrashCan.length > 0) {
                game = this.gameHistoryTrashCan.pop();
                this.gameHistory.push(Game.clone(game));
            }
        }
        this.game = game;
        this.view.game = this.game;
        this.view.render();
        // If we ended at an AI-turn state (partial redo because the trash can
        // ran out), let the AI move so the game continues smoothly.
        if (!this.aiDevelopMode && this.game && this.game.winner === null
            && !this.game.pawnOfTurn.isHumanPlayer) {
            this.aiDo();
        }
    }

    aiDo() {
        if (this.workerFallback) {
            this.runAIOnMainThread();
            return;
        }
        this.worker.postMessage({game: this.game, numOfMCTSSimulations: this.numOfMCTSSimulations, uctConst: this.uctConst, aiDevelopMode: this.aiDevelopMode});
    }

    renderDistancesForAIDevelopMode() {
        //this.view.render2DArrayToBoard(AI.getShortestDistanceToEveryPosition(this.game.pawnOfTurn, this.game));
    }    
}


class AICompetition {
    constructor(isHumanPlayerFirstArrangement, numOfMCTSSimulations0, uctConst0, numOfMCTSSimulations1, uctConst1, numOfGamesToCompete = 50) {
        this.isHumanPlayerFirstArrangement = isHumanPlayerFirstArrangement;
        this.numOfGames = 0;
        this.numOfGamesToCompete = numOfGamesToCompete;
        this.ais = [
            {numOfMCTSSimulations: numOfMCTSSimulations0, uctConst: uctConst0, numWinsLight: 0, numWinsDark: 0},
            {numOfMCTSSimulations: numOfMCTSSimulations1, uctConst: uctConst1, numWinsLight: 0, numWinsDark: 0}
        ];
        this.game = null;
        this.gameHistory = []; // for view check this length propery...
        this.gameHistoryTrashCan = []; // for view check this length propery...
        this.view = new View(this, this.aiDevelopMode);
        this.worker = null;
        this.setNewWorker();
        this.startNewGame();
        this.view.htmlChooseAILevelMessageBox.classList.add("hidden");
    }

    setNewWorker() {
        if (this.worker !== null) {
            this.worker.terminate();
        }
        this.worker = new Worker('js/worker.js');
        const onMessageFunc = function(event) {
            const data = event.data;
            if (typeof(data) === "number") {
                this.view.adjustProgressBar(data * 100);
            } else {
                const move = data;
                this.doMove(move);
            }
        }
        this.worker.onmessage = onMessageFunc.bind(this);
        this.worker.onerror = function(error) {
            console.log('Worker error: ' + error.message + '\n');
            throw error;
        };
    }

    startNewGame() {
        let game = new Game(this.isHumanPlayerFirstArrangement);
        this.game = game;
        this.game.board.pawns[0].isHumanPlayer = true;
        this.game.board.pawns[1].isHumanPlayer = true;
        this.view.game = this.game;
        this.view.render();
        console.log("Game start!")
        const ai_light = this.ais[this.numOfGames%2];
        console.log(ai_light.numOfMCTSSimulations, ai_light.uctConst, "is light-colored pawn!");
        this.aiDo();
    }

    doMove(move) {
        if (this.game.doMove(move, true)) {
            this.view.render();
            if (this.game.winner === null) {
                this.aiDo();
            } else { // game ended.
                if (this.game.winner.index === 0) {
                    this.ais[(this.numOfGames % 2)].numWinsLight++;
                } else {
                    this.ais[((this.numOfGames + 1) % 2)].numWinsDark++;
                }
                this.numOfGames++;
                console.log("Game ended! Here the statistics following...")
                console.log("Number of total games:", this.numOfGames);
                console.log(this.ais[0].numOfMCTSSimulations, this.ais[0].uctConst, "numWinsLight:", this.ais[0].numWinsLight, "numWinsDark", this.ais[0].numWinsDark);
                console.log(this.ais[1].numOfMCTSSimulations, this.ais[1].uctConst, "numWinsLight:", this.ais[1].numWinsLight, "numWinsDark", this.ais[1].numWinsDark);
                if (this.numOfGames < this.numOfGamesToCompete) {
                    this.startNewGame();
                } else {
                    console.log("Competition Ended.");
                }
            }
        } else {
            // suppose that pawnMove can not be return false, if make the View perfect.
            // so if doMove return false, it's from placeWalls.
            this.view.printImpossibleWallMessage();
        }
    }

    aiDo() {
        const index = (this.numOfGames + this.game.turn) % 2 
        this.worker.postMessage({game: this.game, numOfMCTSSimulations: this.ais[index].numOfMCTSSimulations, uctConst: this.ais[index].uctConst, aiDevelopMode: false});
    }
}


