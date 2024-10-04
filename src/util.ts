import 'dotenv/config';
import fs from 'fs';
import * as csv from 'fast-csv'
import axios from 'axios';
import * as cheerio from 'cheerio';
import { urlBySuburb,  urlAgentTotal, urlAgentsByPage, suburbs } from './urlProvider.js'

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
        if (email.includes(secondName.toLowerCase()))
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

// const idListsScraper = async (API_KEY: string, PAGE_URL: string): Promise<string[]> => {
//     const innerIDs: string[] = []
//     const outerURLs: string[] = []

//     try {
//         const html = await getResponse(PAGE_URL)
//         const $ = cheerio.load(html);
//         const liLists = $('li.w-full.relative');
//         liLists.each((_, li) => {
//             const idAttr = $(li).attr('id')

//             if (idAttr && idAttr.startsWith('result-')) {
//                 innerIDs.push(extractPropertyByRegex(idAttr, /result-(\d+)/))
//             } else {
//                 const outerURL = $(li).find('.font-semibold a').attr('href')
//                 if (outerURL)
//                     outerURLs.push(outerURL);
//             }
//         })
//         return innerIDs
//     } catch (error) {
//         console.error('Error fetching data:', error);
//         return []
//     }
// }

// const getLastPage = (htmlString: string): number => {
//     const lastPageResponse = extractPropertyByRegex(htmlString, /"last-link":\s*(\{[^]*?\})/)
//     if (lastPageResponse)
//         return JSON.parse(lastPageResponse).page
//     else
//         return 1
// }

// const pagePropertyScraper = async (API_KEY:string, idLists: string[]) => {
//     for (const id of idLists) {
//         // console.log("pagePropertyScraper", id)
//         try{
//             const link_to_property = urlByID(id)
//             const html = await getResponse(link_to_property)
//             const $ = cheerio.load(html)

//             const price = $('.text-denim.price').text().trim(); 
//             const size = getValidResult($('svg[data-icon="ruler-combined"]').parent().text().trim())
//             const address = extractPropertyByRegex(html, /"display_address":"(.*?)"(?:,"params":|,)/);
            
//             let key_features: string = ''
//             key_features = $('.otm-ListItemOtmBullet.before\\:bg-denim')
//                 .map((index, element) => `${index + 1}. ${$(element).text().trim()}`)
//                 .get().join(', ');
//             // console.log(key_features)
//             if (key_features == '' || key_features.indexOf('2.') == -1) { // if `Property description & features` have no features or only one feature.
//                 $('div[class="text-md space-y-1.5 mt-6 font-heading"]').children('div').each((index, divElement) => {
//                     // console.log('index', index)
//                     const spans = $(divElement).find('span');
//                     const atag = $(divElement).find('a');
//                     if (spans.length === 2) {
//                         const key_feature = `${index + 1}. ${spans.first().text().trim()}${spans.last().text().trim()}`;
//                         key_features += key_features == '' ? key_feature : (', ' + key_feature)
//                     } else if (spans.length === 1 && atag.length === 1) {
//                         const key_feature = `${index + 1}. ${spans.text().trim()}${atag.text().trim()}`;
//                         key_features += key_features == '' ? key_feature : (', ' + key_feature)
//                     }
//             })}
//             key_features = getValidResult(key_features)

//             const description = $('div[item-prop="description"]').text()
//                 .replace(/Description/g, ' ')
//                 .replace(/Location/g, ' ')
//                 .replace(/\s{2,}/g, ' ')
//                 .replace(/\s*\n\s*/g, ' ')
//                 .trim();
//             const agent_name = $('h2.text-base2.font-body').text().trim();
//             const agent_address = $('p.text-sm.text-slate').text().trim().replace(/\n/g, ' ');
//             const agent_phone_number = $('.otm-Telephone.cursor-pointer ').text().trim();

//             propertyList.push({
//                 id: id,
//                 link_to_property: link_to_property,
//                 price: price,
//                 size: size,
//                 address: address,
//                 key_features: key_features,
//                 description: description,
//                 agent_name: agent_name,
//                 agent_address: agent_address,
//                 agent_phone_number: agent_phone_number
//             })

//             // console.log("id: ", id, "link_to_property: ", link_to_property, "price: ", price, "size: ", size, "address: ", address, "key_features: ", key_features, "description: ", description, "agent_name: ", agent_name, "agent_address: ", agent_address, "agent_phone_numbe: ", agent_phone_number)
//         } catch (error) {
//             console.error(`Error processing ID ${id}: `, error)
//         }
//     }
// }

// const getValidResult = (result: string): string => {
//     return result === '' ? 'Ask agent' : result
// }

// const propertyScraper = async (API_KEY: string, PAGE_URL: string) => {
//     // console.log('propertyScraper, pageURL: ', PAGE_URL)
//     try {
//         const html = await getResponse(API_KEY, PAGE_URL)
//         const lastPage = getLastPage(html)
//         // console.log('lastPage: ', lastPage)
//         for(let i = 1; i <= lastPage; i++ ) {
//             // console.log("propertyScraper Page: ", i)
//             const idLists = await idListsScraper(API_KEY, urlByPages(PAGE_URL, i))
//             await pagePropertyScraper(API_KEY, idLists)
//         }
//     } catch (error) {
//         console.error('Error fetching data:', error);
//     }
// }

// const bedMaxMinBasedScraper = async (API_KEY: string, location: string, bedCount: number, maxPrice: number, minPrice: number) => {
//     // console.log("bedMaxMinBasedScraper", API_KEY, location, bedCount, maxPrice, minPrice)
//     // const pageURL = urlByBed(location, bedCount)
//     const pageURL = urlByBedMaxMin(location, bedCount, maxPrice, minPrice)
//     const resultCount = await getSearchResultCount(API_KEY, pageURL)
//     // console.log("resultCount: ", resultCount)
//     if (resultCount >= 1000) {
//         const middlePrice = Number((maxPrice + minPrice) / 2)
//         await bedMaxMinBasedScraper(API_KEY, location, bedCount, middlePrice, minPrice)
//         await bedMaxMinBasedScraper(API_KEY, location, bedCount, maxPrice, middlePrice + 1)
//     } else {
//         await propertyScraper(API_KEY, pageURL)
//     }
// }

const csvWriter = (location: string, propertyList: Property[]) => {
    writeStream = fs.createWriteStream(`${location}.csv`, { encoding: 'utf-8' })
    csv.write(propertyList, { headers: true })
    .on("finish", () => {
        console.log(`CSV file has been written.`)
    }).pipe(writeStream)
}

