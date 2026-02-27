import { setupHome } from "./actions"

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Where do you live?</h1>
        <p className="text-zinc-400 text-lg mb-8">
          Enter your home address to find the nearest BVG stop.
        </p>

        <form action={setupHome} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="address" className="block text-lg font-medium text-zinc-100">
              Home Address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              required
              minLength={5}
              placeholder="e.g. Torstraße 1, Berlin"
              className="w-full h-12 px-4 text-lg rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/50 text-red-400 text-sm font-medium">
              {decodeURIComponent(error)}
            </div>
          )}

          <button
            type="submit"
            className="w-full h-12 text-lg font-semibold rounded-lg bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  )
}
