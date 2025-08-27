import { getMeditationBySlug } from "@cybertantra/database";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import MeditationClient from "./meditation-client";

export const dynamicParams = true;
export const revalidate = false; // Cache forever

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const meditation = await getMeditationBySlug(slug);
  
  if (!meditation) {
    return {
      title: "Meditation Not Found"
    };
  }

  return {
    title: `${meditation.topic} - ${meditation.duration} min meditation | Cybertantra`,
    description: `A ${meditation.duration}-minute guided meditation on ${meditation.topic}. Generated with AI and mixed with ambient music.`,
    openGraph: {
      title: `${meditation.topic} - ${meditation.duration} min meditation`,
      description: `A ${meditation.duration}-minute guided meditation on ${meditation.topic}`,
      type: "website",
      audio: meditation.audioPath,
    },
    twitter: {
      card: "summary",
      title: `${meditation.topic} - ${meditation.duration} min meditation`,
      description: `A ${meditation.duration}-minute guided meditation on ${meditation.topic}`,
    }
  };
}

export default async function MeditationPage({ params }: PageProps) {
  const { slug } = await params;
  const meditation = await getMeditationBySlug(slug);

  if (!meditation) {
    notFound();
  }

  return <MeditationClient meditation={meditation} />;
}