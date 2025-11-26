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

            for (let i = 0; i < timelines; i++) {
                if (runTimeline(pop, birth, viableY, maxPop, generations, stats)) {
                    success++;
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

            // Run one last time with population details for the example
            const exampleResult = runTimelineWithPop(pop, birth, viableY, maxPop, generations, stats);
            const ZisThere = exampleResult.success;
            const finalPop = exampleResult.pop;

            const isMarker = finalPop[0] === 0 && finalPop[1] === 0 && finalPop[2] === 0 && finalPop[3] > 0; // Note: Go code logic for marker seems to be checking for specific failure states returned as [0,0,0,X]. 
            // My runTimelineWithPop returns actual population.
            // Wait, in Go `GenTryFailWithPop` returns `series` which holds the population OR the error code.
            // In my JS `nextGenClean` returns `{status, pop}`. 
            // `runTimelineWithPop` returns the final population.
            // If it failed, the population might be [0,0,0,0] or similar.
            // But the Go code uses "unnatural output" like [0,0,0,1] to signal failure type.
            // My JS `runTimelineWithPop` just returns the population at the end.
            // If I want to match the summary logic exactly, I need to know WHY it failed if it failed.

            // Let's look at the Go summary logic again.
            // `isMarker := finalPop[0] == 0 && finalPop[1] == 0 && finalPop[2] == 0 && finalPop[3] > 0`
            // This checks if the returned "population" is actually an error code [0,0,0,1], [0,0,0,2], etc.
            // My `runTimelineWithPop` returns the ACTUAL population.
            // So I should check if the population is valid.

            const total = finalPop[0] + finalPop[1] + finalPop[2] + finalPop[3];

            if (total > 0) {
                summary += "\nExample timeline final population totals:\n";
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
