import { parsePublishedPortfolio, type PublishedPortfolio, type PublicPortfolioState } from "./public-model.ts";

/** A publication changed or became unavailable between its state and snapshot reads. */
export class PublicationChangedError extends Error {
  constructor() {
    super("The portfolio publication changed while it was being read.");
    this.name = "PublicationChangedError";
  }
}

/**
 * Only a valid snapshot may resolve inside the persistent cache. A missing snapshot must
 * reject, otherwise a brief publication-state race would cache a false 404 for a full hour.
 */
export async function loadPublishedSnapshot(
  read: () => Promise<unknown | null>,
  state: PublicPortfolioState,
): Promise<PublishedPortfolio> {
  const payload = await read();
  if (payload === null) throw new PublicationChangedError();
  const snapshot = parsePublishedPortfolio(payload, state.username, state.version);
  if (!snapshot || snapshot.searchVisible !== state.searchVisible || snapshot.publishedAt !== state.publishedAt)
    throw new Error("The portfolio service returned an invalid public snapshot.");
  return snapshot;
}
