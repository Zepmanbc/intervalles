// Audio
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
const NOTE_INDEX = {
    "B#": 0, "C": 0,
    "C#": 1, "Db": 1,
    "D": 2,
    "D#": 3, "Eb": 3,
    "E": 4,  "Fb": 4,
    "F": 5,  "E#": 5,
    "F#": 6, "Gb": 6,
    "G": 7,
    "G#": 8, "Ab": 8,
    "A": 9,
    "A#": 10, "Bb": 10,
    "B": 11, "Cb": 11,
};
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_LETTERS = ["C","D","E","F","G","A","B"];
const LETTER_TO_INDEX = { C:0, D:1, E:2, F:3, G:4, A:5, B:6 };
const NATURAL_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
const TRIADS = {
    maj: [0, 4, 7],
    min: [0, 3, 7],
    dim: [0, 3, 6],
    aug: [0, 4, 8]
};
const INTERVALS = {
    m2: 1, M2: 2,
    m3: 3, M3: 4,
    P4: 5, TT: 6,
    P5: 7,
    m6: 8, M6: 9,
    m7: 10, M7: 11,
    P8: 12
};
const SCALE_MODES = {
    ionien:  [0, 2, 4, 5, 7, 9, 11, 12],
    dorien:  [0, 2, 3, 5, 7, 9, 10, 12],
    phrygien:[0, 1, 3, 5, 7, 8, 10, 12],
    lydien:  [0, 2, 4, 6, 7, 9, 11, 12],
    mixolydien:[0, 2, 4, 5, 7, 9, 10, 12],
    aeolien: [0, 2, 3, 5, 7, 8, 10, 12],
    locrien: [0, 1, 3, 5, 6, 8, 1, 120]
};

function noteToFrequency(note, octave = 4) {
    const A4 = 440;
    const semitoneIndex = NOTE_INDEX[note];

    const semitonesFromA4 =
        semitoneIndex - NOTE_INDEX["A"] + (octave - 4) * 12;

    return A4 * Math.pow(2, semitonesFromA4 / 12);
}

function transposeFrequency(freq, semitones) {
    return freq * Math.pow(2, semitones / 12);
}

function playFrequency(freq, delay = 0, duration = 1) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.value = freq;

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const t = audioCtx.currentTime + delay;

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.02);
    gain.gain.linearRampToValueAtTime(0, t + duration);

    osc.start(t);
    osc.stop(t + duration);
}

function playFrequencies(freqs, playStyle, direction) {
    const noteDuration = 1;
    const gapBetweenNotes = 0.1;
    if (playStyle === "chord") {
        freqs.forEach(freq => playFrequency(freq, 0, noteDuration));
        return noteDuration;
    } else {
        const ordered = direction === "down" ? [...freqs].reverse() : freqs;

        ordered.forEach((freq, index) => {
            const delay = index * (noteDuration + gapBetweenNotes);
            playFrequency(freq, delay, noteDuration);
        });
        return ordered.length * (noteDuration + gapBetweenNotes);
    }
}

function playInterval(baseFreq, intervalName, playStyle, direction) {
    const semitones = INTERVALS[intervalName];

    const secondFreq =
        direction === "up"
        ? transposeFrequency(baseFreq, semitones)
        : transposeFrequency(baseFreq, -semitones);

    if (playStyle === "chord") {
        playFrequency(baseFreq, 0);
        playFrequency(secondFreq, 0);
        return 1;
    } else {
        playFrequency(baseFreq, 0);
        playFrequency(secondFreq, 1);
    }

}

function playTriad(rootFreq, triadType, playStyle, direction) {
    const intervals = TRIADS[triadType];

    const freqs = intervals.map(semitones =>
        transposeFrequency(rootFreq, semitones)
    );

    return playFrequencies(freqs, playStyle, direction);
}

function playScaleMode(rootFreq, scaleModeName, direction) {
    const intervals = SCALE_MODES[scaleModeName];
    const freqs = intervals.map(semitones =>
        transposeFrequency(rootFreq, semitones)
    );

    const noteDuration = 0.35;
    const gap = 0.05;

    const ordered = direction === "down" ? [...freqs].reverse() : freqs;

    ordered.forEach((freq, i) => {
        const delay = i * (noteDuration + gap);
        playFrequency(freq, delay, noteDuration);
    });

    return ordered.length * (noteDuration + gap);
}

// Affichage des notes
function normalizeNoteName(note) {
    // transforme "C#" ou "Db" en {letter:"C", accidental:1}
    const letter = note[0];
    const accidental = note.length > 1 ? note.slice(1) : "";
    let accValue = 0;

    if (accidental === "#") accValue = 1;
    if (accidental === "b") accValue = -1;

    return { letter, accValue };
}

function getNoteNameFromSemitone(letter, semitoneTarget) {
    const baseSemitone = NATURAL_SEMITONES[LETTER_TO_INDEX[letter]];
    const diff = semitoneTarget - baseSemitone;

    if (diff === 0) return letter;
    if (diff === 1) return letter + "#";
    if (diff === -1) return letter + "b";

    // pour gérer E# / B# / Cb / Fb
    if (diff === 2) return letter + "##";
    if (diff === -2) return letter + "bb";

    return letter; // fallback
}

function getScaleNoteNames(rootNote, modeIntervals) {
    const root = normalizeNoteName(rootNote);
    const rootLetterIndex = LETTER_TO_INDEX[root.letter];
    const rootSemitone = NOTE_INDEX[rootNote];

    const notes = [];

    for (let i = 0; i < modeIntervals.length; i++) {
        const letter = NOTE_LETTERS[(rootLetterIndex + i) % 7];
        const semitone = (rootSemitone + modeIntervals[i]) % 12;

        notes.push(getNoteNameFromSemitone(letter, semitone));
    }

    return notes;
}

function getTriadNoteNames(rootNote, triadType) {
    const intervals = TRIADS[triadType];
    const rootSemitone = NOTE_INDEX[rootNote];

    const rootLetter = rootNote[0];
    const rootLetterIndex = LETTER_TO_INDEX[rootLetter];

    // Lettres des degrés 1–3–5
    const degreeLetters = [
        NOTE_LETTERS[rootLetterIndex % 7],
        NOTE_LETTERS[(rootLetterIndex + 2) % 7],
        NOTE_LETTERS[(rootLetterIndex + 4) % 7]
    ];

    return intervals.map((semitones, i) => {
        const letter = degreeLetters[i];

        const targetSemitone =
            (rootSemitone + semitones + 12) % 12;

        const naturalSemitone =
            NATURAL_SEMITONES[LETTER_TO_INDEX[letter]];

        // ⚠️ différence réelle, sans clamp
        let diff = targetSemitone - naturalSemitone;

        // normalisation modulo 12
        if (diff > 6) diff -= 12;
        if (diff < -6) diff += 12;

        if (diff === 0) return letter;
        if (diff > 0) return letter + "#".repeat(diff);
        if (diff < 0) return letter + "b".repeat(-diff);
    });
}

function getNoteNames(rootNote, content, direction) {
    const rootIndex = NOTE_INDEX[rootNote];

    if (isInterval(content)) {
        const semitones = INTERVALS[content];
        const secondIndex = direction === "up"
            ? rootIndex + semitones
            : rootIndex - semitones;

        return [rootNote, NOTES[(secondIndex + 12) % 12]];
    }

    if (isTriad(content)) {
        const notes = getTriadNoteNames(rootNote, content);
        return direction === "down" ? notes.reverse() : notes;
    }

    if (isScaleMode(content)) {
        const intervals = SCALE_MODES[content];
        return getScaleNoteNames(rootNote, intervals);
    }
}

function showPlayedNotes(notes) {
    playedNotesEl.textContent = notes.join("  -  ");
}

// Exercice logic

function isInterval(content) {return content in INTERVALS;}
function isTriad(content) {return content in TRIADS;}
function isScaleMode(content) {return content in SCALE_MODES;}

function resolveDirection(direction) {
    if (direction !== "random") return direction;
    return Math.random() < 0.5 ? "up" : "down";
}

function resolvePlayStyle(playStyle) {
    if (playStyle !== "random") return playStyle;
    return Math.random() < 0.5 ? "arpeggio" : "chord";
}

function getExerciseConfig() {
    const exerciseType = document.querySelector(".type-btn.active").dataset.type;
    const rootNote = document.querySelector(".root-btn.active").dataset.note;
    const accidental = document.querySelector(".acc-btn.active").dataset.value;
    const direction = document.querySelector(".dir-btn.active").dataset.value;
    const playStyle = document.querySelector(".style-btn.active").dataset.value;
    const content = document.querySelector(".option-btn.active").dataset.value;

    return { rootNote, accidental, direction, playStyle, content, exerciseType };
}

function applyAccidental(note, accidental) {
    if (accidental === "natural") return note;
    if (accidental === "sharp") return note + "#";
    if (accidental === "flat") return note + "b";
}

function getRandomNoteAndAccidental() {
    const note = NOTES[Math.floor(Math.random() * NOTES.length)];
    const accidental = ["flat", "natural", "sharp"][Math.floor(Math.random() * 3)];
    return applyAccidental(note, accidental)
}

function sanitizeRootNoteString(note) {
    if (note.length > 2) {
        return note.slice(0, 2);
    }
    return note;
}

function runExercise(config) {
    const { rootNote, accidental, direction, playStyle, content, exerciseType } = config;

    const resolvedDirection = resolveDirection(direction);
    const resolvedPlayStyle = resolvePlayStyle(playStyle);
    const resolvedRoot = sanitizeRootNoteString(rootNote === "random" ? getRandomNoteAndAccidental() : applyAccidental(rootNote, accidental));
    const notesPlayed = getNoteNames(resolvedRoot, content, resolvedDirection);
    
    showPlayedNotes(notesPlayed);

    console.log("🎵 Exercice");
    console.log("Note de départ :", resolvedRoot);
    console.log("Direction :", resolvedDirection);
    console.log("Mode :", resolvedPlayStyle);
    console.log("Contenu :", content);

    const baseFreq = noteToFrequency(resolvedRoot, 4);

    if (isInterval(content)) {
        playInterval(baseFreq, content, resolvedPlayStyle, resolvedDirection);
        return 2;
    }

    if (isTriad(content)) {
        return playTriad(baseFreq, content, resolvedPlayStyle, resolvedDirection);
    }

    if (isScaleMode(content)) {
        return playScaleMode(baseFreq, content, resolvedDirection);
    }
}

// Interface
const INTERVALS_KEYS = Object.keys(INTERVALS);
const TRIADS_KEYS = Object.keys(TRIADS);
const SCALE_MODES_KEYS = Object.keys(SCALE_MODES);

let isPlaying = false;
let loopId = null;

const startStopBtn = document.getElementById("start-stop");
const exerciseOptions = document.getElementById("exercise-options");
const playedNotesEl = document.getElementById("played-notes");

function renderOptions(type) {
    exerciseOptions.innerHTML = "";

    let list = [];
    if (type === "interval") list = INTERVALS_KEYS;
    if (type === "triad") list = TRIADS_KEYS;
    if (type === "mode") list = SCALE_MODES_KEYS;

    list.forEach(item => {
        const btn = document.createElement("button");
        btn.classList.add("option-btn");
        btn.dataset.value = item;
        btn.textContent = item;
        exerciseOptions.appendChild(btn);

        btn.addEventListener("click", () => {
        document.querySelectorAll(".option-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        });
    });

    // default active first
    exerciseOptions.querySelector("button")?.classList.add("active");
}

function startExercise() {
    isPlaying = true;
    startStopBtn.textContent = "⏹ Stop";
    startStopBtn.style.background = "#f44336";

    runLoop();
}

function stopExercise() {
    isPlaying = false;
    startStopBtn.textContent = "▶ Démarrer";
    startStopBtn.style.background = "#2196f3";

    clearInterval(loopId);
    loopId = null;
}

function runLoop() {
    if (!isPlaying) return;

    const config = getExerciseConfig();
    const sequenceDuration = runExercise(config);

    // pause de 1 seconde après la séquence
    loopId = setTimeout(runLoop, (sequenceDuration + 1) * 1000);
}

// initializaton
startStopBtn.addEventListener("click", () => {
    if (!isPlaying) {
        startExercise();
    } else {
        stopExercise();
    }
});

function setupSwitch(groupId) {
    const group = document.getElementById(groupId);
    const buttons = group.querySelectorAll("button");

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            buttons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
        });
    });
}

document.querySelectorAll(".type-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".type-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        renderOptions(btn.dataset.type);
    });
});

setupSwitch("root-note-group");
setupSwitch("accidental-group");
setupSwitch("exercise-type");
setupSwitch("direction");
setupSwitch("playStyle");
renderOptions("triad");
