-- ==============================================================================
-- Build Together — Baseline Taxonomy Seed Data
-- File: supabase/seed.sql
-- ==============================================================================
-- still it is not pushed i think so don't think that it is pushed.. ok
-- 1. Standard Skills Taxonomy
INSERT INTO public.skills (name, category) VALUES
  ('Frontend Development', 'Engineering'),
  ('Backend Development', 'Engineering'),
  ('Fullstack Development', 'Engineering'),
  ('Mobile Development (iOS)', 'Engineering'),
  ('Mobile Development (Android)', 'Engineering'),
  ('Mobile Development (React Native)', 'Engineering'),
  ('Mobile Development (Flutter)', 'Engineering'),
  ('DevOps & Infrastructure', 'Infrastructure'),
  ('Cloud Architecture (AWS/GCP)', 'Infrastructure'),
  ('Database Design & Optimization', 'Database'),
  ('Application Security', 'Security'),
  ('UI Design', 'Design'),
  ('UX Research', 'Design'),
  ('Product Design & Prototyping', 'Design'),
  ('Design Systems', 'Design'),
  ('AI & Machine Learning', 'AI/Data'),
  ('Natural Language Processing', 'AI/Data'),
  ('Data Engineering', 'AI/Data'),
  ('QA & Automated Testing', 'Quality Assurance'),
  ('Technical Writing & Docs', 'Product'),
  ('Product Management', 'Product')
ON CONFLICT (name) DO NOTHING;

-- 2. Standard Technologies Taxonomy
INSERT INTO public.technologies (name, icon) VALUES
  ('Next.js', 'nextjs'),
  ('React', 'react'),
  ('TypeScript', 'typescript'),
  ('JavaScript', 'javascript'),
  ('Tailwind CSS', 'tailwind'),
  ('Supabase', 'supabase'),
  ('PostgreSQL', 'postgresql'),
  ('Node.js', 'nodejs'),
  ('Python', 'python'),
  ('FastAPI', 'fastapi'),
  ('Django', 'django'),
  ('Go', 'go'),
  ('Rust', 'rust'),
  ('Docker', 'docker'),
  ('Kubernetes', 'kubernetes'),
  ('GraphQL', 'graphql'),
  ('Redis', 'redis'),
  ('Figma', 'figma'),
  ('Flutter', 'flutter'),
  ('React Native', 'react-native'),
  ('Swift', 'swift'),
  ('Kotlin', 'kotlin'),
  ('GitHub Actions', 'github-actions'),
  ('Vercel', 'vercel')
ON CONFLICT (name) DO NOTHING;
