// Garmin daily sync endpoint for Gica Tools.
// Implementation will read credentials from Vercel environment variables only.

export default async function handler(req, res) {
  return res.status(501).json({
    ok: false,
    message: 'Garmin sync endpoint created; integration implementation pending.'
  });
}
