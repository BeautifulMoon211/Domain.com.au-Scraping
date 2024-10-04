import 'dotenv/config';
import fs from 'fs';
import * as csv from 'fast-csv'
import axios from 'axios';
import * as cheerio from 'cheerio';
import { urlBySuburb, urlAgentsByPage, suburbs } from './urlProvider.js'
import { getPropertyFromAgent, getAgentsFromCom, getCompanyLinks } from './util.js'

const API_URL = 'https://api.scraperapi.com';
const API_KEY = process.env.API_KEY ?? "YOUR_DEFAULT_API_KEY"
let writeStream;



interface Property {
    firstName: string,
    secondName: string,
    businessName: string,
    emailAddress: string,
    agency: string,
    suburb: string
}
let propertyList: Property[];

const csvWriter = (option: string) => {
    writeStream = fs.createWriteStream(`${option}.csv`, { encoding: 'utf-8' })
    csv.write(propertyList, { headers: true })
    .on("finish", () => {
        console.log(`CSV file has been written.`)
    }).pipe(writeStream)
}

const agentScraper = async (suburb: string[]) => {
    propertyList = []

    const urlOfCom = await getCompanyLinks(urlBySuburb(suburb))
    for (let url of urlOfCom) {
        const agentsOfCom = await getAgentsFromCom(url)
        for (let agent of agentsOfCom) {
            const propertyOfAgent = await getPropertyFromAgent(suburb[0], agent)
            propertyList.push(propertyOfAgent)
        }

    }

    csvWriter(suburb[0])
}

export default agentScraper