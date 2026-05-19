// Hand-crafted Agent 3 fallback. Fires when the live Anthropic call for a generator-path
// proposal fails. Returns an on-brand single-sentence "activity" line built from the
// chosen venue + shared interests, with no LLM call. CLAUDE.md §16.

import type { Venue } from "../types";

export function templateActivity(venue: Venue, sharedInterests: string[]): string {
  const interestTouch = sharedInterests.length > 0 ? ` for some ${sharedInterests[0]}` : "";
  // A few different shapes so it doesn't feel templated across multiple demos.
  const shapes = [
    `Meet up${interestTouch} at ${venue.name}`,
    `Get together${interestTouch} at ${venue.name}`,
    `An easy evening${interestTouch} at ${venue.name}`,
    `A small gathering${interestTouch} at ${venue.name}`,
  ];
  const i = (venue.id.charCodeAt(venue.id.length - 1) + sharedInterests.length) % shapes.length;
  return shapes[i];
}
