import { VevoStatus } from '@prisma/client';
import json2xml from 'json2xml';

const DHA_B2B_ENDPOINT = process.env.VEVO_B2B_ENDPOINT || '';
const B2B_USERNAME = process.env.VEVO_B2B_USERNAME || '';
const B2B_PASSWORD = process.env.VEVO_B2B_PASSWORD || '';
const USE_MOCK = process.env.VEVO_USE_MOCK !== 'false';

export class VevoService {
    /**
     * Fallback mock for local development and testing
     */
    private static mockVevoCheck(passport_no: string): VevoStatus {
        if (passport_no.endsWith('0000')) {
            return VevoStatus.DENIED;
        }
        return VevoStatus.APPROVED;
    }

    /**
     * Checks Visa Status using the Department of Home Affairs B2B Gateway.
     * In Mock mode, it verifies the passport number ending.
     */
    static async checkVisaStatus(passportNumber: string, dob?: Date, nationality?: string): Promise<VevoStatus> {
        if (USE_MOCK) {
            console.log(`[VEVO Service] Using MOCK mode for passport: ${passportNumber}`);
            return this.mockVevoCheck(passportNumber);
        }

        if (!DHA_B2B_ENDPOINT || !B2B_USERNAME || !B2B_PASSWORD) {
            console.error('[VEVO Service] Error: Missing B2B Gateway credentials in environment variables.');
            throw new Error('VEVO Gateway is not configured properly.');
        }

        // Real B2B Gateway Integration
        // Note: Full B2B integration requires specific wsdl schema generation.
        // This constructs a simplified representation of the expected WS-Security SOAP envelope.
        try {
            const soapRequest = this.buildSoapRequest(passportNumber, dob, nationality);

            console.log(`[VEVO Service] Sending SOAP request to B2B Gateway for passport: ${passportNumber}`);

            const response = await fetch(DHA_B2B_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/xml;charset=UTF-8',
                    'SOAPAction': '"http://www.diac.gov.au/vevo/b2b/CheckVisaStatus"' // Example action
                },
                body: soapRequest
            });

            if (!response.ok) {
                console.error(`[VEVO Service] Gateway error: HTTP ${response.status}`);
                return VevoStatus.PENDING; // Fail open to allow manual admin review if gateway fails
            }

            const responseText = await response.text();
            return this.parseSoapResponse(responseText);

        } catch (error) {
            console.error('[VEVO Service] Exception during gateway call:', error);
            return VevoStatus.PENDING; // Graceful degradation
        }
    }

    private static buildSoapRequest(passportNumber: string, dob?: Date, nationality?: string): string {
        const timestamp = new Date().toISOString();

        // Constructing the JSON representation for the json2xml converter
        const envelope = {
            'soapenv:Envelope': {
                '@xmlns:soapenv': 'http://schemas.xmlsoap.org/soap/envelope/',
                '@xmlns:vev': 'http://www.diac.gov.au/vevo/b2b/',
                'soapenv:Header': {
                    'wsse:Security': {
                        '@xmlns:wsse': 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd',
                        'wsse:UsernameToken': {
                            'wsse:Username': B2B_USERNAME,
                            'wsse:Password': B2B_PASSWORD
                        }
                    }
                },
                'soapenv:Body': {
                    'vev:CheckVisaStatusRequest': {
                        'vev:TravelDocumentNumber': passportNumber,
                        'vev:DateOfBirth': dob ? dob.toISOString().split('T')[0] : '1990-01-01', // Example fallback
                        'vev:CountryOfDocument': nationality || 'AUS' // Example fallback
                    }
                }
            }
        };

        return `<?xml version="1.0" encoding="UTF-8"?>\n${json2xml(envelope)}`;
    }

    private static parseSoapResponse(responseXml: string): VevoStatus {
        // In a real implementation, you would use an XML parser like fast-xml-parser
        // This is a simplified regex parsing for the POC
        if (responseXml.includes('<WorkEntitlement>Unlimited</WorkEntitlement>') || responseXml.includes('<VisaStatus>In Effect</VisaStatus>')) {
            return VevoStatus.APPROVED;
        } else if (responseXml.includes('<WorkEntitlement>None</WorkEntitlement>')) {
            return VevoStatus.DENIED;
        } else if (responseXml.includes('<WorkEntitlement>Limited</WorkEntitlement>')) {
            return VevoStatus.RESTRICTED;
        }

        // If parsing fails or status is unknown
        return VevoStatus.PENDING;
    }
}
