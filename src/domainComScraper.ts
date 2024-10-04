import 'dotenv/config';
import fs from 'fs';
import * as csv from 'fast-csv'
import axios from 'axios';
import * as cheerio from 'cheerio';
import { zipCodes, urlByZipCode } from './urlProvider.js'
import zipCodeBasedScraper from './zipCodeBasedScraper.js';

const API_URL = 'https://api.scraperapi.com';
let writeStream;

interface Property {
    id: string;
    link_to_property: string;
    price: string;
    size: string;
    address: string;
    key_features: string;
    description: string;
    agent_name: string;
    agent_address: string;
    agent_phone_number: string;
}
const propertyList: Property[] = [];

const csvWriter = (option: string) => {
    writeStream = fs.createWriteStream(`${option}.csv`, { encoding: 'utf-8' })
    csv.write(propertyList, { headers: true })
    .on("finish", () => {
        console.log(`CSV file has been written.`)
    }).pipe(writeStream)
}

const domainComScraper = async (option: string) => {
    for (let zipCode of zipCodes) {
        propertyList.push(... await zipCodeBasedScraper(urlByZipCode(option, zipCode.toString())))
    }

    csvWriter(option)
}

export default domainComScraper