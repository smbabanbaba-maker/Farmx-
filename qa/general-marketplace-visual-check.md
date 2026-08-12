# General Marketplace Production QA

- Production SSR preview on `http://localhost:4173/` loads successfully after the latest build.
- The dashboard now shows the Lagos fallback state selector and product imagery from `/public/products`.
- The former balance card and agriculture-only dashboard content are absent.
- The featured section displays the first three state-prioritized items; the dashboard also renders a 40-item product discovery list.
- Mobile bottom navigation renders five items: Home, Saved, Sell, Messages, and Profile.
- General marketplace names, prices, categories, and Nigerian state locations render correctly in the production response.

The browser’s screenshot overlay does not accurately reflect product-image pixels, but the SSR page text and image paths confirm the new content is served by the production output.

The production `/market` route also loads correctly. It displays the search field, filter trigger, subscription call-to-action, 40 general-marketplace product cards, photo paths, message actions, and paid boost controls. The response confirms no top-level “Add Product” button appears on the market page.

The `/product/1` production route renders the requested three tabs—Product info, Seller info, and Similar products—along with a product gallery, specifications, seller actions, secure-payment control, and pay-on-delivery option. The `/post-product` route renders all 16 requested general categories, all Nigerian states, the mandatory five-photo policy, and the Basic Boost (₦2,500), TOP Promo (₦5,000), and Premium Boost (₦15,000) choices.
