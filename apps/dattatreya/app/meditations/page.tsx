import { getAllMeditations } from "@cybertantra/database";
import Link from "next/link";

export const revalidate = 60; // Revalidate every minute

export default async function MeditationsPage() {
  const meditations = await getAllMeditations();

  return (
    <div className="min-h-screen bg-black text-white font-mono p-8">
      <div className="max-w-2xl mx-auto">
        <div className="space-y-2">
          {meditations.length === 0 ? (
            <p className="text-gray-500 text-center text-xs">No meditations yet</p>
          ) : (
            meditations.map((meditation) => (
              <Link
                key={meditation.id}
                href={`/meditation/${meditation.slug}`}
                className="block border border-gray-800 p-4 hover:border-white transition-colors"
              >
                <div className="text-sm">{meditation.topic}</div>
                <div className="text-gray-500 text-xs mt-1">
                  {meditation.duration} minutes • {new Date(meditation.createdAt).toLocaleDateString()}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}