# Account onboarding

Use `/auth/corporate`, `/auth/vendor`, `/auth/recipient`, or `/auth/admin`. Public registration accepts only the role represented by its endpoint. Email verification is mandatory before password sign-in and before linking existing recipient data. Vendor accounts start pending review; company balances start at zero.

NextAuth handles sessions. Account email and token confirmation use `/api/auth/account`. Administrator bootstrap is CLI-only. The root README documents operator setup.
