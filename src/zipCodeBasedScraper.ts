import onthemarketPropertyScraper from './domainComPropertyScraper.js'

const API_KEY = process.env.API_KEY ?? 'YOUR_DEFAULT_API_KEY'

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

const zipCodeBasedScraper = async (baseUrl: string): Promise<Property[]> => {
    console.log("Domain.com_Scraper - API_KEY : ", API_KEY);
    await onthemarketPropertyScraper(API_KEY, baseUrl)
    return []
}

export default zipCodeBasedScraper