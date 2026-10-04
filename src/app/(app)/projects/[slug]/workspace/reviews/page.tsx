import { redirect } from 'next/navigation';

interface ReviewsRedirectPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ReviewsRedirectPage(props: ReviewsRedirectPageProps) {
  const { slug } = await props.params;
  redirect(`/projects/${slug}/workspace/code`);
}
