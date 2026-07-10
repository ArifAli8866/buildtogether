import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Outlet />
        </motion.div>
      </div>

      {/* Right side - Illustration */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary-600 via-primary-700 to-accent-600 items-center justify-center p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center text-white max-w-lg">
          <div className="mb-8">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none">
                <path d="M30 55 L45 40 L55 50 L70 35" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="30" cy="55" r="4" fill="white"/>
                <circle cx="45" cy="40" r="4" fill="white"/>
                <circle cx="55" cy="50" r="4" fill="white"/>
                <circle cx="70" cy="35" r="4" fill="white"/>
              </svg>
            </div>
            <h2 className="text-3xl font-display font-bold mb-4">
              Where Ideas Meet Developers
            </h2>
            <p className="text-white/80 text-lg">
              Join thousands of builders creating the next generation of products together.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mt-12">
            <div>
              <div className="text-3xl font-bold">10K+</div>
              <div className="text-white/70 text-sm mt-1">Developers</div>
            </div>
            <div>
              <div className="text-3xl font-bold">2.5K+</div>
              <div className="text-white/70 text-sm mt-1">Projects</div>
            </div>
            <div>
              <div className="text-3xl font-bold">500+</div>
              <div className="text-white/70 text-sm mt-1">Teams</div>
            </div>
          </div>

          {/* Testimonial */}
          <div className="mt-12 bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <p className="text-white/90 italic mb-4">
              "BuildTogether helped me find the perfect team for my startup idea. Within a week, I had a full team ready to build."
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 bg-white/30 rounded-full" />
              <div className="text-left">
                <div className="font-semibold text-sm">Sarah Chen</div>
                <div className="text-white/70 text-xs">Founder, TechStartup</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
