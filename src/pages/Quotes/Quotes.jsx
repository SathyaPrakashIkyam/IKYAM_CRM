import { Navigate } from 'react-router-dom'

/**
 * Dedicated Navigation Routes:
 * - /quotesList        -> QuotesList (list all quotes, search & status filters)
 * - /newQuotes         -> NewQuotes (quote builder, product catalog & pricing)
 * - /quotesDetails/:id -> QuotesDetails (quote view & edit)
 */
export default function Quotes() {
  return <Navigate to="/quotesList" replace />
}

