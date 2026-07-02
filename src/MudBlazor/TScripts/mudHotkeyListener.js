// Copyright (c) MudBlazor 2021
// MudBlazor licenses this file to you under the MIT license.
// See the LICENSE file in the project root for more information.

"use strict";

// noinspection JSUnusedGlobalSymbols
/**
 * Companion interop for the MudHotkey component.
 * Matches exact key-plus-modifier combinations to avoid accidental overlaps.
 */
class MudHotkeyListener {
    constructor() {
        this._hotkeys = new Map();
        this._heldCodes = new Set();

        this._handleKeyDownBound = this._handleKeyDown.bind(this);
        this._handleKeyUpBound = this._handleKeyUp.bind(this);

        document.addEventListener("keydown", this._handleKeyDownBound);
        document.addEventListener("keyup", this._handleKeyUpBound);
        window.addEventListener("blur", () => this._heldCodes.clear());
    }

    /**
     * Releases global keyboard listeners.
     */
    dispose() {
        document.removeEventListener("keydown", this._handleKeyDownBound);
        document.removeEventListener("keyup", this._handleKeyUpBound);
    }

    /**
     * Registers a hotkey, or replaces an existing definition with the same hotkey ID.
     */
    registerOrUpdateHotkey(dotnetRef, dotnetMethodId, hotkeyId, key, modifiers, preventDefault) {
        modifiers = modifiers || [];
        const newHotkey = this._createHotkey(dotnetRef, dotnetMethodId, hotkeyId, key, modifiers, preventDefault);
        this._hotkeys.set(hotkeyId, newHotkey);
    }

    /**
     * Removes a previously registered hotkey by ID.
     */
    unregisterHotkey(hotkeyId) {
        if (this._hotkeys.has(hotkeyId)) {
            this._hotkeys.delete(hotkeyId);
        } else {
            console.warn("[MudBlazor] MudHotkey: No matching hotkey found to unregister");
        }
    }

    _createHotkey(dotnetRef, dotnetMethodId, hotkeyId, key, modifiers, preventDefault) {
        return {
            dotnetRef: dotnetRef,
            dotnetMethodId: dotnetMethodId,
            hotkeyId: hotkeyId,
            key: key,
            modifiers: new Set(modifiers),
            preventDefault: preventDefault
        };
    }

    _handleKeyDown(e) {
        this._heldCodes.add(e.code);
        this._matchHotkeys(e);
    }

    _handleKeyUp(e) {
        this._heldCodes.delete(e.code);
    }

    _matchHotkeys(e) {
        const pressedKey = e.code || e.key;
        const pressedModifiers = this._getPressedModifiers(e);

        for (const hotkey of this._hotkeys.values()) {
            if (pressedKey !== hotkey.key) continue;

            const allModifiersPressed = [...hotkey.modifiers].every(m => pressedModifiers.has(m));
            const noExtraModifiersPressed = [...pressedModifiers].every(m => hotkey.modifiers.has(m));
            // Require an exact modifier match so broader shortcuts do not shadow more specific ones.
            if (allModifiersPressed && noExtraModifiersPressed) {
                if (hotkey.preventDefault) {
                    e.preventDefault();
                }

                try {
                    // noinspection JSUnresolvedReference
                    hotkey.dotnetRef.invokeMethodAsync(hotkey.dotnetMethodId);
                } catch (err) {
                    console.error("[MudBlazor] MudHotkey: DotNet invocation failed", {
                        key: hotkey.key,
                        modifiers: [...hotkey.modifiers],
                        err: err
                    });
                }

                // Stop at first match to preserve deterministic registration order.
                break;
            }
        }
    }

    _getPressedModifiers() {
        const MODIFIER_CODES = ["ControlLeft", "ControlRight", "ShiftLeft", "ShiftRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight"];
        return new Set([...this._heldCodes].filter(c => MODIFIER_CODES.includes(c)));
    }
}

if (!window.mudHotkeyListener) {
    window.mudHotkeyListener = new MudHotkeyListener();
}
