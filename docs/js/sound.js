"use strict";

/*
* sound.js
*
* Simple sound engine for Quoridor — plays a single audio file (audio/modern.mp3)
* on every interaction. No synthesis, no per-event sounds — just one sound,
* triggered on every meaningful user/game action.
*
* The mp3 file is loaded once and replayed on demand. If the file is missing
* or fails to load, all Sound.* calls silently no-op (the game still works).
*
* Browsers require audio playback to be initiated inside a user gesture, so
* Sound.init() is called on the first mousedown/keydown/touchstart. The page
* wires this up automatically in index.html.
*
* Usage:
*   Sound.init();              // call on first user gesture
*   Sound.play();              // play modern.mp3 once
*   Sound.toggleMute();        // flip mute state, returns new muted value
*/

const Sound = {
    audio: null,
    muted: false,
    _ready: false,

    init() {
        if (this.audio) return;
        try {
            const a = new Audio('audio/modern.mp3');
            a.preload = 'auto';
            // When the file is loaded, mark ready. If it fails (404, etc.),
            // we just leave _ready = false and all play() calls no-op.
            a.addEventListener('canplaythrough', () => { this._ready = true; });
            a.addEventListener('error', () => {
                console.warn('[Sound] audio/modern.mp3 failed to load — sounds will be silent. Drop your file at audio/modern.mp3');
                this._ready = false;
            });
            this.audio = a;
        } catch (e) {
            console.warn('[Sound] Audio unavailable:', e.message);
        }
    },

    // Some browsers create audio elements in a suspended state — call this
    // inside a user gesture to unlock playback.
    unlock() {
        if (!this.audio) this.init();
        if (this.audio) {
            // Play+mute a zero-volume burst to satisfy the gesture requirement
            const wasMuted = this.muted;
            this.muted = true;
            try {
                const p = this.audio.play();
                if (p && typeof p.then === 'function') {
                    p.then(() => {
                        this.audio.pause();
                        this.audio.currentTime = 0;
                        this.muted = wasMuted;
                    }).catch(() => {
                        this.muted = wasMuted;
                    });
                } else {
                    this.audio.pause();
                    this.audio.currentTime = 0;
                    this.muted = wasMuted;
                }
            } catch (e) {
                this.muted = wasMuted;
            }
        }
    },

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    },

    // Play modern.mp3 from the start. If a previous play is still going,
    // restart it so rapid interactions always get a fresh sound.
    play() {
        if (this.muted) return;
        if (!this.audio) this.init();
        if (!this.audio) return;
        try {
            // If already playing, restart from 0 for immediate feedback
            this.audio.currentTime = 0;
            const p = this.audio.play();
            if (p && typeof p.catch === 'function') {
                p.catch(() => {
                    // Autoplay was blocked — ignore; the next user gesture will unlock it
                });
            }
        } catch (e) {
            // Silently ignore — sound is non-critical
        }
    },

    // ===================================================================
    // Compatibility shims — the rest of the codebase calls these names.
    // All of them just play modern.mp3. They exist so view.js/controller.js
    // don't need to be edited when swapping the sound engine.
    // ===================================================================
    move()        { this.play(); },
    aiMove()      { this.play(); },
    wallPlace()   { this.play(); },
    aiWallPlace() { this.play(); },
    invalid()     { this.play(); },
    undo()        { this.play(); },
    redo()        { this.play(); },
    pause()       { this.play(); },
    resume()      { this.play(); },
    resumeContext() { /* no-op — kept for index.html compatibility */ },
    newGame()     { this.play(); },
    win()         { this.play(); },
    lose()        { this.play(); },
    click()       { this.play(); },
    select()      { this.play(); },
};
