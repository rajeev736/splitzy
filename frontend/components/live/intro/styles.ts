/**
 * The glossy game type used by the match splash and the intro avatars
 * (GlossyText, IntroAvatar's initials). Static: no animation here.
 */
export const GLOSS_CSS = `
.pi-gloss{position:relative;display:inline-block;font-family:ui-rounded,"SF Pro Rounded","Arial Rounded MT Bold","Nunito",var(--font-inter,system-ui),"Segoe UI",system-ui,sans-serif;
  font-weight:900;line-height:1.12;white-space:nowrap;letter-spacing:-.01em}
.pi-gloss-back{position:absolute;inset:0;color:var(--pi-rim);-webkit-text-stroke:.2em var(--pi-rim);text-shadow:0 .08em 0 var(--pi-rim),0 .16em .2em rgba(10,4,30,.22)}
.pi-gloss-face{position:relative;display:block;color:transparent;-webkit-background-clip:text;background-clip:text;
  background-image:linear-gradient(180deg,var(--pi-top) 0%,var(--pi-top) 50%,var(--pi-tint) 56%,var(--pi-tint) 100%)}
`
