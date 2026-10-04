import { redirect } from 'next/navigation';

interface ReviewDetailRedirectPageProps {
  params: Promise<{
    slug: string;
    reviewId: string;
  }>;
}

export default async function ReviewDetailRedirectPage(props: ReviewDetailRedirectPageProps) {
  const { slug, reviewId } = await props.params;
  redirect(`/projects/${slug}/workspace/code/${reviewId}`);
}
