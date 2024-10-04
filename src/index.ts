import { suburbs } from './urlProvider.js'
import agentScraper from './domainComAgentsScraper.js'

const main = async () => {
    try {
        for (let suburb of [['abbotsford', '3067']])
            agentScraper(suburb)
    } catch (error) { 
        console.error('Error in main execution:', error)
    }
}

main();