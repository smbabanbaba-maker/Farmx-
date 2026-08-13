# Profile Preview QA

- Profile dashboard opens in development preview mode without AWS configuration errors and shows the centralized preview profile, metrics, and Profile centre menu.
- My Ads renders the required status tabs and card controls. Draft filtering worked, and the Edit Ad form saved a revised title back to browser-persisted preview state.
- Pro Sales renders campaign history; creating a campaign added a scheduled campaign with preview metrics.
- FarmX Balance renders service-only balance and transaction history, explicitly stating it is not a product-payment wallet.
- Production build, lint, and TypeScript checks have completed successfully before this browser pass.

## Test-only preview state

Browser local storage now includes an edited Draft advert title and one scheduled Boost campaign created during QA. This state is local to the preview browser and is not committed as seed data.

