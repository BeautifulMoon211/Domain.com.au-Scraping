import agentScraper from './domainComAgentsScraper.js'

const main = async () => {
    try {
        for (let suburb of [['acheron', '3714']])
            agentScraper(suburb)
    } catch (error) { 
        console.error('Error in main execution:', error)
    }
}

main();