document.getElementById('simForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const runBtn = document.getElementById('runBtn');
    const originalText = runBtn.innerText;
    runBtn.innerText = 'Running...';
    runBtn.disabled = true;

    // Use setTimeout to allow UI to update before blocking with calculation
    setTimeout(() => {
        try {
            const adam = parseInt(document.getElementById('adam').value);
            const eve = parseInt(document.getElementById('eve').value);
            const lilith = parseInt(document.getElementById('lilith').value);
            const diana = parseInt(document.getElementById('diana').value);

            const eveBirth = parseFloat(document.getElementById('eveBirth').value);
            const lilithBirth = parseFloat(document.getElementById('lilithBirth').value);
            const dianaBirth = parseFloat(document.getElementById('dianaBirth').value);

            const viableY = document.getElementById('viableY').checked ? "Y" : "N";
            const maxPop = parseInt(document.getElementById('maxPop').value);
            const generations = parseInt(document.getElementById('generations').value);
            const timelines = parseInt(document.getElementById('timelines').value);

            const pop = [adam, eve, lilith, diana];
            const birth = [eveBirth, lilithBirth, dianaBirth];

            const stats = new SimulationStats();
            let success = 0;


            // Collect data for stats
            const allHistories = [];
            const maxTrackedTimelines = 1000; // Prevent memory issues with huge simulations

            for (let i = 0; i < timelines; i++) {
                // Determine if we should track history for this run
                const trackHistory = i < maxTrackedTimelines;

                // If we are tracking history, we MUST use runTimelineHistory
                // If not, we can use the faster runTimeline (but we still need success/fail for summary)

                // Actually, to answer the user's request for "representative of all timelines", 
                // we probably need to sample if N is huge, or just track the first N.
                // Let's settle on tracking the first `maxTrackedTimelines`.

                if (trackHistory) {
                    const result = runTimelineHistory(pop, birth, viableY, maxPop, generations, stats);
                    if (result.success) success++;
                    allHistories.push(result.history);
                } else {
                    // Fallback to faster, no-alloc runTimeline for remaining iterations if count is huge
                    if (runTimeline(pop, birth, viableY, maxPop, generations, stats)) {
                        success++;
                    }
                }
            }

            let summary = "";
            summary += success + " out of " + timelines + " timelines still had the Z chromosome by the end.\n";

            if (stats.totalExtinction > 0) {
                summary += stats.totalExtinction + " failed because EVERYONE died out.\n";
            }
            if (stats.zExtinction > 0) {
                summary += stats.zExtinction + " failed because Lilith and Diana died out. There were still Women, but no more Z chromosomes.\n";
            }
            if (stats.maleExtinction > 0) {
                summary += stats.maleExtinction + " failed because men died out. Usually because total population got too small.\n";
            }
            if (stats.femExtinction > 0) {
                summary += stats.femExtinction + " failed because women died out completely. Usually because total population got too small.\n";
            }
            if (stats.lastGen > 0) {
                summary += "If they ended without either men or a Z chromosome, they did so within " + stats.lastGen + " generations.\n";
            }
            if (stats.maxPopReached > 0) {
                summary += stats.maxPopReached + " were cut off early because they reached a population size of " + maxPop + "\n";
                summary += "They hit that population cap at or below " + stats.popCapGen + " generations.\n";
            }

            // Run one last time with population details for the example *and history*
            const exampleResult = runTimelineHistory(pop, birth, viableY, maxPop, generations, stats);
            const ZisThere = exampleResult.success;
            // The last element of history is the final population
            const history = exampleResult.history;
            const finalPop = history[history.length - 1];

            const total = finalPop[0] + finalPop[1] + finalPop[2] + finalPop[3];

            if (total > 0) {
                summary += "\nExample timeline results:\n";
                summary += "Adam: " + finalPop[0] + "\n";
                summary += "Eve: " + finalPop[1] + "\n";
                summary += "Lilith: " + finalPop[2] + "\n";
                summary += "Diana: " + finalPop[3] + "\n";
                summary += "\nPercentages:\n";
                summary += "Adam: " + (100 * finalPop[0] / total).toFixed(2) + "%\n";
                summary += "Eve: " + (100 * finalPop[1] / total).toFixed(2) + "%\n";
                summary += "Lilith: " + (100 * finalPop[2] / total).toFixed(2) + "%\n";
                summary += "Diana: " + (100 * finalPop[3] / total).toFixed(2) + "%\n";
            } else {
                summary += "\nExample timeline ended with extinction.\n";
            }

            if (ZisThere && total >= maxPop) {
                summary += "\nExample timeline ended successfully by reaching the population cap.\n";
            }

            // --- Chart Generation ---
            // Calculate stats across all histories
            const chartData = calculateStats(allHistories, generations);
            renderCharts(chartData);

            const resultsContainer = document.getElementById('results');
            const resultText = document.getElementById('resultText');

            resultText.innerText = summary;
            resultsContainer.classList.remove('hidden');

            // Scroll to results
            resultsContainer.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error(error);
            alert('An error occurred: ' + error.message);
        } finally {
            runBtn.innerText = originalText;
            runBtn.disabled = false;
        }
    }, 10);
});

// Chart instances
let malePopChartInstance = null;
let totalPopChartInstance = null;
let zChromChartInstance = null;

function calculateStats(histories, maxGen) {
    const generations = [];
    const maleStats = { median: [], p10: [], p90: [] };
    const totalPopStats = { median: [], p10: [], p90: [] };
    const zChromStats = { median: [], p10: [], p90: [] };

    // Find actual max generations across histories (some might die out early)
    // Actually, histories track up to failure or maxGen. If they fail, they return short arrays.
    // We should normalize length or handle missing data.
    // Let's iterate up to maxGen.

    // Correction: `generations` input is an integer (count), not array. 
    // And histories can be different lengths.
    // If a timeline dies out at gen 5, what is its population at gen 10? 0.
    // We must treat short histories as trailing zeros.

    let actualMaxLen = 0;
    histories.forEach(h => {
        if (h.length > actualMaxLen) actualMaxLen = h.length;
    });

    for (let g = 0; g < actualMaxLen; g++) {
        generations.push(g);

        const genMale = [];
        const genTotal = [];
        const genZ = [];

        histories.forEach(h => {
            // If history is shorter than g, population is 0
            let pop = [0, 0, 0, 0];
            if (g < h.length) {
                pop = h[g];
            }

            const adam = pop[0];
            const eve = pop[1];
            const lilith = pop[2];
            const diana = pop[3];
            const total = adam + eve + lilith + diana;

            genTotal.push(total);

            if (total > 0) {
                genMale.push((adam / total) * 100);
                const zCarriers = lilith + diana;
                genZ.push((zCarriers / total) * 100);
            } else {
                genMale.push(0);
                genZ.push(0);
            }
        });

        // Helper for percentiles
        const getPercentile = (arr, p) => {
            if (arr.length === 0) return 0;
            arr.sort((a, b) => a - b);
            const index = (arr.length - 1) * p;
            const lower = Math.floor(index);
            const upper = Math.ceil(index);
            const weight = index - lower;
            if (upper >= arr.length) return arr[lower];
            return arr[lower] * (1 - weight) + arr[upper] * weight;
        };

        maleStats.median.push(getPercentile(genMale, 0.5));
        maleStats.p10.push(getPercentile(genMale, 0.1));
        maleStats.p90.push(getPercentile(genMale, 0.9));

        totalPopStats.median.push(getPercentile(genTotal, 0.5));
        totalPopStats.p10.push(getPercentile(genTotal, 0.1));
        totalPopStats.p90.push(getPercentile(genTotal, 0.9));

        zChromStats.median.push(getPercentile(genZ, 0.5));
        zChromStats.p10.push(getPercentile(genZ, 0.1));
        zChromStats.p90.push(getPercentile(genZ, 0.9));
    }

    return { generations, maleStats, totalPopStats, zChromStats };
}

function renderCharts(data) {
    const { generations, maleStats, totalPopStats, zChromStats } = data;

    // Destroy existing charts
    if (malePopChartInstance) malePopChartInstance.destroy();
    if (totalPopChartInstance) totalPopChartInstance.destroy();
    if (zChromChartInstance) zChromChartInstance.destroy();

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: '#e0e0e0' } },
            tooltip: { // Improved tooltip to show range
                mode: 'index',
                intersect: false
            }
        },
        scales: {
            x: { ticks: { color: '#a0a0a0' }, grid: { color: '#333' } },
            y: { ticks: { color: '#a0a0a0' }, grid: { color: '#333' } }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    };

    const createDataset = (label, color, stats) => [
        {
            label: label + ' (Median)',
            data: stats.median,
            borderColor: color,
            backgroundColor: color,
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            zIndex: 10
        },
        {
            label: '80% Range',
            data: stats.p90,
            borderColor: 'transparent',
            backgroundColor: color.replace(')', ', 0.2)').replace('rgb', 'rgba'),
            fill: '+1', // Fill to next dataset (which will be p10, added in reverse order effectively or we manage order)
            // Wait, Chart.js filling usually works by filling to a specific dataset index relative to current.
            // A common pattern for confidence intervals is:
            // 1. Upper bound (transparent line)
            // 2. Lower bound (transparent line, fill to Upper)
            // But we want a labeled Median.
            // Let's try: 
            // 1. Median
            // 2. P90 (hidden line)
            // 3. P10 (fill to P90)
            pointRadius: 0
        },
        {
            label: 'Lower Bound', // Hide this label?
            data: stats.p10,
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            fill: '-1', // Fill to previous dataset (P90)
            pointRadius: 0
        }
    ];

    // For chart.js 'fill: -1' means fill to previous dataset.
    // So usually order is: Median, Upper(P90), Lower(P10).
    // If P10 fills to '-1', it fills to P90.
    // So the area between P10 and P90 is colored.

    // Male Pop Chart
    const ctxMale = document.getElementById('malePopChart').getContext('2d');
    malePopChartInstance = new Chart(ctxMale, {
        type: 'line',
        data: {
            labels: generations,
            datasets: createDataset('Male %', 'rgb(187, 134, 252)', maleStats)
        },
        options: {
            ...commonOptions,
            scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, min: 0, max: 100 } },
            plugins: {
                ...commonOptions.plugins, legend: {
                    labels: {
                        color: '#e0e0e0',
                        filter: item => item.text.includes('(Median)') // Only show Median in legend
                    }
                }
            }
        }
    });

    // Total Pop Chart
    const ctxTotal = document.getElementById('totalPopChart').getContext('2d');
    totalPopChartInstance = new Chart(ctxTotal, {
        type: 'line',
        data: {
            labels: generations,
            datasets: createDataset('Total Pop', 'rgb(3, 218, 198)', totalPopStats)
        },
        options: {
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins, legend: {
                    labels: {
                        color: '#e0e0e0',
                        filter: item => item.text.includes('(Median)')
                    }
                }
            }
        }
    });

    // Z Chrom Chart
    const ctxZ = document.getElementById('zChromChart').getContext('2d');
    zChromChartInstance = new Chart(ctxZ, {
        type: 'line',
        data: {
            labels: generations,
            datasets: createDataset('Z Carriers %', 'rgb(207, 102, 121)', zChromStats)
        },
        options: {
            ...commonOptions,
            scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, min: 0, max: 100 } },
            plugins: {
                ...commonOptions.plugins, legend: {
                    labels: {
                        color: '#e0e0e0',
                        filter: item => item.text.includes('(Median)')
                    }
                }
            }
        }
    });
}
