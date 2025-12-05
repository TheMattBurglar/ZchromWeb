// Global constants
const Adam = ["X", "Y"];
const Eve = ["X", "X"];
const Lilith = ["Z", "Y"];
const Diana = ["Z", "X"];

class SimulationStats {
    constructor() {
        this.maleExtinction = 0;
        this.femExtinction = 0;
        this.zExtinction = 0;
        this.totalExtinction = 0;
        this.maxPopReached = 0;
        this.lastGen = 0;
        this.popCapGen = 0;
    }
}

function randomInt(max) {
    return Math.floor(Math.random() * max);
}

function randomWoman() {
    const r = randomInt(3);
    if (r === 0) return Eve;
    if (r === 1) return Lilith;
    return Diana;
}

// Port of nextGenClean
function nextGenClean(seedPop, birthRateELD, viableY, maxPopulation, stats) {
    let newFem = 0;
    let nMale = 0;
    let nEve = 0;
    let nLilith = 0;
    let nDiana = 0;

    // Next gen born from Eve
    const eveBirths = seedPop[1] * birthRateELD[0];
    for (let i = 0; i < eveBirths; i++) {
        const kid = [Adam[randomInt(2)], Eve[randomInt(2)]];
        if (kid[0] === "Y") {
            nMale++;
        } else {
            newFem++;
            nEve++;
        }
    }

    // Next gen born from Lilith
    const lilithBirths = seedPop[2] * birthRateELD[1];
    for (let i = 0; i < lilithBirths; i++) {
        const kid = [Lilith[randomInt(2)], Adam[randomInt(2)]];
        if (kid[0] === "Y" && kid[1] === "Y") {
            i--; // YY not viable, try again
        } else if (kid[0] === "Y" && kid[1] === "X") {
            if (viableY === "Y" || viableY === "y") {
                nMale++;
            } else {
                i--; // Y egg not viable
            }
        } else if (kid[0] === "Z" && kid[1] === "Y") {
            nLilith++;
            newFem++;
        } else {
            nDiana++;
            newFem++;
        }
    }

    // Next gen born from Diana
    const dianaBirths = seedPop[3] * birthRateELD[2];
    for (let i = 0; i < dianaBirths; i++) {
        const kid = [Diana[randomInt(2)], Adam[randomInt(2)]];
        if (kid[0] === "Z" && kid[1] === "X") {
            newFem++;
            nDiana++;
        } else if (kid[0] === "Z" && kid[1] === "Y") {
            newFem++;
            nLilith++;
        } else if (kid[0] === "X" && kid[1] === "X") {
            newFem++;
            nEve++;
        } else {
            nMale++;
        }
    }

    const newPop = [nMale, nEve, nLilith, nDiana];
    const total = nMale + newFem;

    if (nMale === 0 && newFem === 0) {
        // Total extinction
    }
    if (nMale === 0) {
        return { status: 1, pop: newPop };
    }
    if (newFem === 0) {
        return { status: 2, pop: newPop };
    }
    if (nLilith === 0 && nDiana === 0) {
        return { status: 3, pop: newPop };
    }
    if (total >= maxPopulation) {
        return { status: 4, pop: newPop };
    }

    return { status: 0, pop: newPop };
}

// Port of nextGen (wrapper around nextGenClean for stats updating)
function nextGen(seedPop, birthRateELD, viableY, maxPopulation, stats) {
    const result = nextGenClean(seedPop, birthRateELD, viableY, maxPopulation, stats);

    if (result.status === 1) stats.maleExtinction++;
    if (result.status === 2) stats.femExtinction++;
    if (result.status === 3) stats.zExtinction++;
    if (result.pop[0] === 0 && result.pop[1] === 0 && result.pop[2] === 0 && result.pop[3] === 0) { // Check for total extinction manually as nextGenClean doesn't return unique status for it if nMale is 0
        stats.totalExtinction++;
    }
    if (result.status === 4) stats.maxPopReached++;

    return result.pop;
}


function genTryFail(seedPop, birthRateELD, viableY, maxPopulation, generations, stats) {
    let series = nextGen(seedPop, birthRateELD, viableY, maxPopulation, stats);

    for (let count = 1; count <= generations; count++) {
        const isTotalExtinction = series[0] === 0 && series[1] === 0 && series[2] === 0 && series[3] === 0;
        const isMaleExtinction = series[0] === 0 && !isTotalExtinction; // Simplified check
        const isFemExtinction = (series[1] + series[2] + series[3]) === 0 && !isTotalExtinction;
        const isZExtinction = (series[2] + series[3]) === 0 && !isTotalExtinction && !isFemExtinction;
        // Note: nextGenClean returns status 4 for max pop, but nextGen just returns pop. 
        // We need to check max pop here or rely on nextGen updating stats.
        // Actually, nextGen updates stats. But we need to know if we should stop.
        // The original Go code checks return values [0,0,0,1] etc. which are "unnatural output".
        // My nextGen implementation returns the actual population.
        // Let's refactor nextGen to behave more like the Go one or just use nextGenClean logic inside.

        // Let's stick closer to the Go logic where nextGen returns "unnatural" populations for signals.
        // OR, better, let's just use nextGenClean logic here since we are rewriting it.

        // Wait, the Go code's nextGen returns [0,0,0,1] for male extinction. 
        // That's a bit hacky. I'll use the status from nextGenClean.
    }
    return false;
}

// Re-implementing genTryFail to be cleaner and correct
function runTimeline(seedPop, birthRateELD, viableY, maxPopulation, generations, stats) {
    let currentPop = seedPop;

    // First generation
    let result = nextGenClean(currentPop, birthRateELD, viableY, maxPopulation, stats);

    // Update stats for first generation failure? 
    // The Go code calls nextGen, which updates stats.
    // Let's replicate that behavior.

    // Actually, let's just implement the loop properly.

    for (let count = 1; count <= generations; count++) {
        result = nextGenClean(currentPop, birthRateELD, viableY, maxPopulation, stats);
        currentPop = result.pop;

        if (currentPop[0] === 0 && currentPop[1] === 0 && currentPop[2] === 0 && currentPop[3] === 0) {
            stats.totalExtinction++;
            if (stats.lastGen <= count) stats.lastGen = count;
            return false;
        }
        if (result.status === 1) {
            stats.maleExtinction++;
            if (stats.lastGen <= count) stats.lastGen = count;
            return false;
        }
        if (result.status === 2) {
            stats.femExtinction++;
            if (stats.lastGen <= count) stats.lastGen = count;
            return false;
        }
        if (result.status === 3) {
            stats.zExtinction++;
            if (stats.lastGen <= count) stats.lastGen = count;
            return false;
        }
        if (result.status === 4) {
            stats.maxPopReached++;
            if (stats.popCapGen <= count) stats.popCapGen = count;
            return true;
        }

        if (count === generations) {
            return true;
        }
    }
    return false;
}

function runTimelineWithPop(seedPop, birthRateELD, viableY, maxPopulation, generations, stats) {
    let currentPop = seedPop;

    for (let count = 1; count <= generations; count++) {
        let result = nextGenClean(currentPop, birthRateELD, viableY, maxPopulation, stats);
        currentPop = result.pop;

        if (currentPop[0] === 0 && currentPop[1] === 0 && currentPop[2] === 0 && currentPop[3] === 0) {
            return { success: false, pop: currentPop };
        }
        if (result.status === 1 || result.status === 2 || result.status === 3) {
            return { success: false, pop: currentPop };
        }
        if (result.status === 4) {
            return { success: true, pop: currentPop };
        }

        if (count === generations) {
            return { success: true, pop: currentPop };
        }
    }
    return { success: false, pop: currentPop };
}

function runTimelineHistory(seedPop, birthRateELD, viableY, maxPopulation, generations, stats) {
    let currentPop = [...seedPop]; // Copy to avoid mutating original immediately if that matters
    const history = [];

    // Push initial state (Gen 0)
    history.push([...currentPop]);

    for (let count = 1; count <= generations; count++) {
        let result = nextGenClean(currentPop, birthRateELD, viableY, maxPopulation, stats);
        currentPop = result.pop;
        history.push([...currentPop]);

        if (currentPop[0] === 0 && currentPop[1] === 0 && currentPop[2] === 0 && currentPop[3] === 0) {
            return { success: false, history: history };
        }
        if (result.status === 1 || result.status === 2 || result.status === 3) {
            return { success: false, history: history };
        }
        if (result.status === 4) {
            return { success: true, history: history };
        }
    }
    return { success: true, history: history };
}
