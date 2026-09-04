# HMLR property matching

PropertyAdviser uses HM Land Registry's Transaction unique identifier and UPRN Look Up Table to connect a property's UPRN to published Price Paid transaction identifiers.

Flow:

1. Read the property's UPRN from `properties.uprn`.
2. Query `hmlr_uprn_lookup` by UPRN.
3. Deduplicate transaction IDs because one UPRN can occur in multiple published relationships.
4. Resolve transaction IDs from `hmlr_price_paid_transactions` when that local transaction dataset has been imported.
5. Treat the UPRN → transaction-ID relationship as deterministic only when an actual HMLR lookup row exists.
6. Do not infer a match from postcode, address text, or price alone.

The endpoint is `GET /api/hmlr-property.js` and accepts either `property_id`/`propertyId` or a numeric `uprn` query parameter. It requires the Supabase service-role key server-side and never exposes that credential to the browser.

A missing UPRN relationship is not treated as evidence that a transaction is invalid. HM Land Registry states that some transactions cannot be assigned a UPRN when a reliable address relationship cannot be established.

## Attribution

Contains HM Land Registry data © Crown copyright and database right. This data is licensed under the Open Government Licence v3.0.

UPRNs contain OS data © Crown copyright and database rights. This data is licensed under the Open Government Licence v3.0.
