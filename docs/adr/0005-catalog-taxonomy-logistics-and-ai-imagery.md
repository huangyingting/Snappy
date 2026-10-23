# ADR 0005: Catalog and logistics provenance

Accepted. Catalog entries belong to real registered vendors. Approved vendors supply HTTPS-hosted product photography, inventory, supported regions, variants, and specifications. Administrators and company owners curate their collections; vendors cannot inject new products into someone else's private collection.

Clones start as drafts with zero stock. New installations contain no sample products or photos. The old deployment-specific image-generation endpoint and preset gallery have been removed; product data is not sent to an embedded third-party AI endpoint.

Shipment events identify vendor-entered updates as vendor activity, not independently verified carrier telemetry.
