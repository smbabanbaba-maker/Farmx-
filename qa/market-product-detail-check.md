# Market and Product Detail QA

The production `/market` route was checked after the update. It shows the Get subscribed call-to-action with the subscription destination, and the former Add Product control is absent. The listing grid remains available with message and promotion controls.

The production `/product/1` route was checked and renders a full product experience: gallery controls, promoted status, location, price guide, request-call and telephone actions, quick-chat prompts, message box, seller details, buyer-protection options, detailed product facts, feedback cards, follow/save/report actions, and similar listings. Product interaction actions are visible and route through the existing messaging, order, preference, and payment flows.

The Get subscribed CTA was clicked in the production Market page and correctly opened `/subscribe`, where the available subscription plans and installment actions render.
