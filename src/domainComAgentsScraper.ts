import 'dotenv/config';
import { urlBySuburb } from './urlProvider.js'
import { getPropertyFromAgent, getAgentsFromCom, getCompanyLinks, csvWriter } from './util.js'

interface Property {
    firstName: string,
    secondName: string,
    businessName: string,
    emailAddress: string,
    agency: string,
    suburb: string
}
let propertyList: Property[];

const agentScraper = async (suburb: string[]) => {
    propertyList = []

    const urlOfCom = await getCompanyLinks(urlBySuburb(suburb))
    // const urlOfCom = ["https://www.domain.com.au/real-estate-agencies/bigginscottstonnington-3276"]
    for (let url of urlOfCom) {
        const agentsOfCom = await getAgentsFromCom(url)
        // const agentsOfCom = ['https://www.domain.com.au/real-estate-agent/etienne-des-anges-678582', 'https://www.domain.com.au/real-estate-agent/hayley-georgiou-1964137']
        for (let agent of agentsOfCom) {
            const propertyOfAgent = await getPropertyFromAgent(suburb[0], agent)
            propertyList.push(propertyOfAgent)
        }
    }

    csvWriter(suburb[0], propertyList)
}

export default agentScraper