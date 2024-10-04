import 'dotenv/config';
import fs from 'fs';
import * as csv from 'fast-csv'
import axios from 'axios';
import * as cheerio from 'cheerio';
import { urlAgentTotal, urlAgentsByPage } from './urlProvider.js'

let writeStream;
const API_URL = 'https://api.scraperapi.com';
const API_KEY = process.env.API_KEY ?? 'YOUR_DEFAULT_API_KEY'

interface Property {
    firstName: string,
    secondName: string,
    businessName: string,
    emailAddress: string,
    agency: string,
    suburb: string
}

export const getResponse = async (PAGE_URL: string): Promise<string> => {
    console.log('Fetching data with ScraperAPI...', API_KEY, PAGE_URL);
    const queryParams = new URLSearchParams({
        api_key: API_KEY,
        url: PAGE_URL,
        country_code: 'us'
    });

    try {
        const response = API_KEY === 'YOUR_DEFAULT_API_KEY' 
            ? await axios.get(PAGE_URL) 
            : await axios.get(`${API_URL}?${queryParams.toString()}`)
        if (!response.data) {  
            throw new Error('No data received from API');  
        }
        return response.data;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error
    }
}

export const getSearchResultCount = async (PAGE_URL: string): Promise<number> => {
    try {
        const html = await getResponse(PAGE_URL)
        const $ = cheerio.load(html);
        const resultCount = Number(extractPropertyByRegex($("title").text(), /(\d+)/))
        return resultCount
    } catch(error) {
        console.error('Error fetching data:', error);
        return -1
    }
}

export const getCompanyLinks = async (PAGE_URL: string): Promise<string[]> => {
    const resultCount = await getSearchResultCount(PAGE_URL)
    const pageCount = Math.ceil(resultCount / 15)
    const companyUrlList: string[] = []

    for (let i = 1; i <= pageCount; i++) {
        const html = await getResponse(urlAgentsByPage(PAGE_URL, i));
        const $ = cheerio.load(html);
        const profileCards = $('div[data-testid="profile-card"]')
        profileCards.each((_, el) => {
            companyUrlList.push(urlAgentTotal($(el).find('a').attr('href')))  
        })
    }

    return companyUrlList
}

const removeDuplicates = (array: string[]): string[] => {
    return [...new Set(array)];
}

export const getAgentsFromCom = async (PAGE_URL: string) : Promise<string[]> => {
    const agentUrlList: string[] = []
    const html = await getResponse(PAGE_URL)
    const $ = cheerio.load(html)

    $('.css-1beaf7d').each((_, el) => {
        const link = $(el).children('div').eq(1).find('a').attr('href') || $(el).children('div').eq(0).find('a').attr('href');
        if (link)
            agentUrlList.push(link)
    })
    return removeDuplicates(agentUrlList)
}

const extractEmails = (html: string): string[] => {  
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;  
    return html.match(emailPattern) || [];  
}

export const getPropertyFromAgent = async (suburb: string, PAGE_URL: string): Promise<Property> => {
    const html = await getResponse(PAGE_URL)
    const $ = cheerio.load(html)

    const agentName = $('h1[data-testid="trade-profile-hero-section__name"]').text().trim() || $('[data-testid="trade-profile-hero-banner__name"]').text().trim()
    const firstName = agentName.split(" ")[0]
    const secondName = agentName.split(" ")[1]
    const businessName = $('[data-testid="trade-profile-hero-banner__agent-job-position"]').text().trim() || $('[data-testid="trade-profile-hero-section__agent-job-position"]').text().trim()
    
    let emailAddress = "";
    const emailHTML = await getResponse(urlAgentTotal($('[data-testid="listing-card-single-image"]').children('a').attr('href')))
    const emails = extractEmails(emailHTML)
    for (let email of emails) {
        if (email.includes(firstName.toLowerCase()) || email.includes(secondName.toLowerCase()))
            emailAddress = email
    }

    const agency = $('p[data-testid="trade-profile-hero-section__name"]').text().trim()

    console.log( "firstName: ", firstName,  "secondName: ", secondName,  "businessName: ", businessName,  "emailAddress: ", emailAddress,  "agency: ", agency,  "suburb: ", suburb, )

    return {
        firstName: firstName,
        secondName: secondName,
        businessName: businessName,
        emailAddress: emailAddress,
        agency: agency,
        suburb: suburb
    }
}

const extractPropertyByRegex = (url: string, regex: RegExp): string => {
    const match = url.match(regex);
    return match ? match[1] : ""
}

export const csvWriter = (location: string, propertyList: Property[]) => {
    writeStream = fs.createWriteStream(`${location}.csv`, { encoding: 'utf-8' })
    csv.write(propertyList, { headers: true })
    .on("finish", () => {
        console.log(`CSV file has been written.`)
    }).pipe(writeStream)
}