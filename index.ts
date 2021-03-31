import * as pdns from 'powerdns_api';
import * as request from 'request';
import * as publicIp from 'public-ip';

const SUBDOMAIN = process.env.SUBDOMAIN || 'spf1';
const ZONE = process.env.ZONE || 'example.de';

const HOSTNAME = process.env.PDNS_HOSTNAME || 'pdns-host';
const PORT = process.env.PDNS_PORT || 443;
const APIKEY = process.env.PDNS_APIKEY || 'api-key';

const api = new pdns.PowerDNS(HOSTNAME, PORT, APIKEY);

const version = 'v1';
const server = 'localhost';

api.baseUrl = `https://${HOSTNAME}:${PORT}/api/${version}/servers/${server}`;

api.request = request.defaults({
    headers: {
        'X-API-Key': api.apiKey,
        'Accept': 'application/json'
    },
    baseUrl: api.baseUrl,
    json: true
});

const updateZone = async (zoneName: string, subDomain: string, content: string, ttl = 60, type = 'TXT') =>
{
    console.log('=== updateZone ===');
    const disabled = false;
    const createPtr = false;
    const record = `${subDomain}.${zoneName}`;
    let rrset = new pdns.RRSet(record, type, ttl, 'REPLACE');
    rrset.addRecord(content, disabled, createPtr);
    const rrsets = [];
    rrsets.push(rrset.get());
    try
    {
        await api.updateZone(zoneName, rrsets)
        console.log(`${type} record, ${record} with value ${content}`)
        return { zoneName, record, content }
    }
    catch (e)
    {
        throw e;
    }
}

const delay = (ms) =>
{
    return new Promise(resolve =>
    {
        setTimeout(resolve, ms);
    });
}

const updateSpfRecord = async (zoneName: string) =>
{
    console.log('=== getZone ===');
    if (zoneName === null)
    {
        console.log('We have no zones to query details about.');
        return;
    }
    const zone = await api.getZone(zoneName);
    const records = zone?.rrsets?.filter((a) => (a.name.indexOf('_spf_ip_') === 0))?.map((a) => (a?.records[0]?.content.replace(/^"|"$/gi, ''))).filter(a => (!!a));
    const line = `"v=spf1 ip4:${records.join(' ip4:')} ~all"`;
    await updateZone(zoneName, SUBDOMAIN, line, 60, 'TXT');
}

(async () =>
{
    const NODEIP = process.env.NODE_IP || await publicIp.v4();
    // update current node ip
    await updateZone(ZONE, `_spf_ip_${NODEIP}`, `"${NODEIP}"`);
    // await delay(Math.random() * 10000);
    // update spf record
    await updateSpfRecord(ZONE);
    await delay(Math.random() * 1000);
    process.exit(0);
})();
