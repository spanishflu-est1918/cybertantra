import { getAllMeditations } from "@cybertantra/database";
import Link from "next/link";

export const revalidate = 60; // Revalidate every minute

export default async function MeditationsPage() {
  const meditations = await getAllMeditations();

  return (
    <div className="min-h-screen bg-black text-white font-mono p-8 relative overflow-hidden">
      {/* CRT effects */}
      <div className="crt-overlay pointer-events-none absolute inset-0 animate-crt-bend">
        <div className="scanlines absolute inset-0" />
        <div className="vignette absolute inset-0" />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Terminal header */}
        <div className="mb-8">
          <div className="text-xs text-gray-600 mb-2">
            {">"} LIST_MEDITATIONS
          </div>
          <div className="text-xs text-gray-800">═══════════════════════</div>
        </div>

        <div className="space-y-2">
          {meditations.length === 0 ? (
            <p className="text-gray-500 text-center text-xs">NO_DATA</p>
          ) : (
            meditations.map((meditation, index) => (
              <Link
                key={meditation.id}
                href={`/meditation/${meditation.slug}`}
                className="block border border-gray-900 bg-black p-3 hover:border-gray-700 hover:bg-gray-950 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-gray-700 text-xs">
                    [{String(index + 1).padStart(2, "0")}]
                  </span>
                  <div className="flex-1">
                    <div className="text-sm group-hover:text-green-400 transition-colors crt-text-glow">
                      {meditation.topic}
                    </div>
                    <div className="text-gray-600 text-xs mt-1 font-mono">
                      {meditation.duration}MIN •{" "}
                      {new Date(meditation.createdAt)
                        .toLocaleDateString("en-US", {
                          month: "short",
                          day: "2-digit",
                          year: "2-digit",
                        })
                        .toUpperCase()}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="text-xs text-gray-800">═══════════════════════</div>
          <div className="text-xs text-gray-700 mt-2">
            TOTAL: {meditations.length}
          </div>
        </div>
      </div>
    </div>
  );
}
