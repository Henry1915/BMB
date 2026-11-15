# BMB Tech Firm website (Netlify)

A static multi-page site (`public/index.html`) plus two Netlify Functions that handle the quote form.

## Deploy to Netlify
1. Push this folder to a Git repository (GitHub, GitLab or Bitbucket) and use "Add new site > Import an existing project" in Netlify.
   Settings are read from `netlify.toml` (publish folder `public`, functions in `netlify/functions`).
   Or use the CLI: `npm install -g netlify-cli`, then `npm install`, then `netlify deploy --prod`.
   Note: drag-and-drop deploys publish the site but do not build functions, so use Git or the CLI.
2. In Netlify go to Site configuration > Environment variables and add the values from `.env.example`.
3. Redeploy after changing environment variables.

## Messages go to email and WhatsApp
When a visitor sends the quote form:
1. `/api/contact` validates it, saves it (Netlify Blobs) and emails it to `MAIL_TO` (needs the SMTP variables).
2. If "Also send this to us on WhatsApp" is ticked (default), WhatsApp opens with the message already written to your
   number (`whatsapp` in `CONTACT`, `public/index.html`). The visitor taps send.
3. Optional and automatic: set the `WHATSAPP_*` variables and the function also sends you a WhatsApp alert for every
   enquiry through Meta's WhatsApp Business Cloud API. Meta only allows free-form text to numbers that messaged you in
   the last 24 hours, so create an approved template with 5 variables (name, email, service, budget, message) and set
   `WHATSAPP_TEMPLATE` for reliable alerts.

The form reports success if at least one of save, email or WhatsApp alert worked.

## Add your details
In `public/index.html` find `var CONTACT={phone:"",email:"",website:"",whatsapp:""};`.
For `whatsapp` use digits with the country code and no plus sign, e.g. `233201234567`.
`var CUR="GHS";` sets the currency in the budget list.

## Read saved messages
`GET https://your-site.netlify.app/api/admin/messages` with header `Authorization: Bearer <ADMIN_TOKEN>`.
You can also view them in Netlify under Blobs, or just use your email inbox.

## Local development
`npm install`, `npm install -g netlify-cli`, then `netlify dev` and open the address it prints.

## Logo
Swap `public/assets/bmb-mark.png` (header, white on transparent) and `public/assets/bmb-logo.png` (footer).
The original is `public/assets/BMB_Tech_Firm_Logo.png`.

## Tip: spam protection
The form has a hidden honeypot field. For heavier traffic, add Netlify's rate limiting to the functions
(see Netlify docs) or a CAPTCHA.
