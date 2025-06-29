import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { ServiceCategory, ServiceProviderWithUser } from "@shared/schema";
import ServiceCategoryCard from "@/components/ServiceCategoryCard";
import ServiceProviderCard from "@/components/ServiceProviderCard";
import MainLayout from "@/components/MainLayout";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import AuthPage from "@/pages/auth-page";
import OnboardingWalkthrough from "@/components/OnboardingWalkthrough";
import { 
  Loader2, 
  MapPin, 
  ArrowRight, 
  Star, 
  CheckCircle, 
  Users, 
  Clock, 
  Shield, 
  Zap,
  Play,
  ChevronDown,
  Sparkles
} from "lucide-react";
import { motion, useAnimation } from "framer-motion";

const AnimatedCounter = ({ end, duration = 2 }: { end: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  const controls = useAnimation();
  
  useEffect(() => {
    controls.start({
      opacity: 1,
      transition: { duration: 0.5 }
    });
    
    const timer = setInterval(() => {
      setCount(prevCount => {
        if (prevCount < end) {
          return prevCount + Math.ceil(end / (duration * 10));
        }
        return end;
      });
    }, 100);
    
    return () => clearInterval(timer);
  }, [end, duration, controls]);
  
  return (
    <motion.span
      animate={controls}
      initial={{ opacity: 0 }}
      className="text-4xl font-bold text-primary"
    >
      {count.toLocaleString()}+
    </motion.span>
  );
};

const FeatureCard = ({ icon, title, description, delay = 0 }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      viewport={{ once: true }}
      className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
    >
      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </motion.div>
  );
};

export default function HomePage() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [searchCategory, setSearchCategory] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Check if user is new and should see onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding && !user) {
      // Show onboarding after a short delay for new visitors
      const timer = setTimeout(() => {
        setOnboardingOpen(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Fetch service categories
  const { data: categories, isLoading: categoriesLoading } = useQuery<ServiceCategory[]>({
    queryKey: ["/api/categories"],
  });

  // Fetch top service providers
  const { data: providers, isLoading: providersLoading } = useQuery<ServiceProviderWithUser[]>({
    queryKey: ["/api/providers"],
  });

  // Handle search
  const handleSearch = () => {
    if (searchCategory) {
      setLocation(`/service-categories?category=${searchCategory}&location=${encodeURIComponent(searchLocation)}`);
    }
  };

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setOnboardingOpen(false);
  };

  const handleOnboardingSkip = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setOnboardingOpen(false);
  };

  return (
    <MainLayout>
      {/* Hero Section with Animated Background */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-xl"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [360, 180, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500/10 rounded-full blur-xl"
          />
          <motion.div
            animate={{
              y: [-20, 20, -20],
              x: [-10, 10, -10],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-1/2 left-1/2 w-32 h-32 bg-indigo-500/10 rounded-full blur-lg"
          />
        </div>

        <div className="container mx-auto px-4 text-center text-white relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Find Your Helper
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto"
            >
              Connect with trusted local service providers. From home cleaning to repairs, 
              find the perfect helper for any task in your neighborhood.
            </motion.p>
          </motion.div>

          {/* Search Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-4xl mx-auto mb-12"
            data-onboarding="search-section"
          >
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Select value={searchCategory} onValueChange={setSearchCategory}>
                  <SelectTrigger className="bg-white/20 border-white/30 text-white placeholder:text-white/70">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div data-onboarding="location-input">
                <Input
                  placeholder="Enter your location"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/70"
                />
              </div>
              <Button 
                onClick={handleSearch}
                className="bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 hover:scale-105"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Find Helpers
              </Button>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.9 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            {user ? (
              <Button
                onClick={() => setLocation('/client-dashboard')}
                size="lg"
                className="bg-white text-primary hover:bg-white/90 font-semibold py-4 px-8 rounded-full transition-all duration-300 hover:scale-105"
              >
                Go to Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => setAuthDialogOpen(true)}
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 font-semibold py-4 px-8 rounded-full transition-all duration-300 hover:scale-105"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  onClick={() => scrollToSection('how-it-works')}
                  variant="outline"
                  size="lg"
                  className="border-white/30 text-white hover:bg-white/10 font-semibold py-4 px-8 rounded-full transition-all duration-300 hover:scale-105"
                >
                  <Play className="w-5 h-5 mr-2" />
                  See How It Works
                </Button>
              </>
            )}
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/70 cursor-pointer"
          onClick={() => scrollToSection('stats')}
        >
          <ChevronDown className="w-8 h-8" />
        </motion.div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Trusted by Thousands
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join our growing community of service providers and satisfied customers
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <AnimatedCounter end={1500} />
              <p className="text-gray-600 mt-2">Service Providers</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <AnimatedCounter end={5000} />
              <p className="text-gray-600 mt-2">Happy Customers</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <AnimatedCounter end={12000} />
              <p className="text-gray-600 mt-2">Tasks Completed</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <AnimatedCounter end={98} />
              <p className="text-gray-600 mt-2">% Satisfaction Rate</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white" data-onboarding="verification">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose FindMyHelper?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We make it easy to find trusted professionals for any task
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Shield className="w-6 h-6 text-primary" />}
              title="Verified Professionals"
              description="All service providers are background-checked and verified by our call center team for your safety and peace of mind."
              delay={0.1}
            />
            <FeatureCard
              icon={<MapPin className="w-6 h-6 text-primary" />}
              title="Location-Based Matching"
              description="Find helpers nearby with our advanced location-based system. Get connected with providers within 6-10km of your location."
              delay={0.2}
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-primary" />}
              title="Real-Time Notifications"
              description="Get instant notifications when providers respond to your tasks. Stay updated throughout the entire process."
              delay={0.3}
            />
            <FeatureCard
              icon={<Clock className="w-6 h-6 text-primary" />}
              title="Quick Response"
              description="Get responses from qualified providers within minutes of posting your task. No more waiting around."
              delay={0.4}
            />
            <FeatureCard
              icon={<Users className="w-6 h-6 text-primary" />}
              title="24/7 Call Center Support"
              description="Our dedicated call center team is available around the clock to assist with any questions or concerns."
              delay={0.5}
            />
            <FeatureCard
              icon={<Star className="w-6 h-6 text-primary" />}
              title="Quality Guarantee"
              description="All work is backed by our quality guarantee. Rate and review providers to maintain high standards."
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* Video Demo Section */}
      <section className="py-20 bg-black text-white relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">
              See FindMyHelper in Action
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Watch how easy it is to connect with service providers in your area
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative max-w-4xl mx-auto"
          >
            <div className="relative bg-gradient-to-br from-blue-900 to-purple-900 rounded-2xl p-8 aspect-video flex items-center justify-center">
              {/* Video Placeholder with Animation */}
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/30 transition-all duration-300 hover:scale-110">
                  <Play className="w-10 h-10 text-white ml-1" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-white/20 rounded-full"
                />
              </motion.div>
              
              {/* Floating Elements */}
              <motion.div
                animate={{ y: [-10, 10, -10], rotate: [0, 5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold"
              >
                Task Posted ✓
              </motion.div>
              <motion.div
                animate={{ y: [10, -10, 10], rotate: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold"
              >
                3 Providers Near You
              </motion.div>
              <motion.div
                animate={{ x: [-5, 5, -5] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-semibold"
              >
                Call Center Verified ✓
              </motion.div>
            </div>
            
            <p className="text-center text-gray-400 mt-4">
              Click to watch our 60-second demo
            </p>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Getting help is as easy as 1, 2, 3
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Post Your Task",
                description: "Describe what you need help with, set your location, and specify your budget.",
                icon: <MapPin className="w-8 h-8 text-white" />
              },
              {
                step: "2",
                title: "Get Matched",
                description: "Nearby service providers receive notifications and respond to your task.",
                icon: <Users className="w-8 h-8 text-white" />
              },
              {
                step: "3",
                title: "Get It Done",
                description: "Our call center verifies the provider and you get the task completed safely.",
                icon: <CheckCircle className="w-8 h-8 text-white" />
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    {item.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">{item.title}</h3>
                <p className="text-gray-600 text-lg">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Categories Preview */}
      {categories && categories.length > 0 && (
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Popular Services
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Browse our most requested service categories
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" data-onboarding="categories">
              {categories.slice(0, 8).map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <ServiceCategoryCard category={category} />
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              viewport={{ once: true }}
              className="text-center mt-12"
            >
              <Link href="/service-categories">
                <Button size="lg" variant="outline" className="hover:scale-105 transition-transform">
                  View All Services
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-br from-gray-900 to-black text-white relative overflow-hidden">
        {/* Background Animation */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white/20 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">
              What Our Customers Say
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Real stories from real customers who found their perfect helper
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Johnson",
                role: "Busy Mom",
                text: "FindMyHelper saved me so much time! I found a reliable cleaner within hours of posting my task. The call center verification gave me complete peace of mind.",
                rating: 5,
                delay: 0.1
              },
              {
                name: "Mike Chen",
                role: "Small Business Owner",
                text: "As a provider, this platform connects me with local customers who actually need my services. The location-based matching is brilliant!",
                rating: 5,
                delay: 0.2
              },
              {
                name: "Emily Rodriguez",
                role: "Working Professional",
                text: "The privacy controls are excellent. I loved that providers only got my address after verification. Felt totally secure throughout the process.",
                rating: 5,
                delay: 0.3
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: testimonial.delay }}
                viewport={{ once: true }}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/20 transition-all duration-300"
              >
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: testimonial.delay + i * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    </motion.div>
                  ))}
                </div>
                <p className="text-gray-200 mb-4">"{testimonial.text}"</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white font-semibold">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-gray-400 text-sm">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Providers Preview */}
      {providers && providers.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Top-Rated Providers
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Meet some of our highest-rated service providers
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {providers.slice(0, 6).map((provider, index) => (
                <motion.div
                  key={provider.id}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <ServiceProviderCard provider={provider} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Interactive Demo Section */}
      <section className="py-20 bg-white relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Experience the Magic
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Interactive demo showing our real-time notification system
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Mock Phone Interface */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="bg-gray-900 rounded-3xl p-4 mx-auto max-w-sm">
                  <div className="bg-white rounded-2xl overflow-hidden">
                    <div className="bg-primary text-white p-4 text-center">
                      <h3 className="font-semibold">FindMyHelper</h3>
                    </div>
                    <div className="p-4 space-y-3 h-96 overflow-hidden">
                      {/* Animated Notifications */}
                      {[
                        { delay: 1, text: "New task posted: House Cleaning", type: "task" },
                        { delay: 3, text: "3 providers responded", type: "response" },
                        { delay: 5, text: "Call center verified provider", type: "verified" },
                        { delay: 7, text: "Address details shared", type: "address" }
                      ].map((notification, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20, scale: 0.8 }}
                          whileInView={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.5, delay: notification.delay }}
                          viewport={{ once: true }}
                          className={`p-3 rounded-lg shadow-sm border-l-4 ${
                            notification.type === 'task' ? 'bg-blue-50 border-blue-500' :
                            notification.type === 'response' ? 'bg-green-50 border-green-500' :
                            notification.type === 'verified' ? 'bg-purple-50 border-purple-500' :
                            'bg-orange-50 border-orange-500'
                          }`}
                        >
                          <p className="text-sm text-gray-700">{notification.text}</p>
                          <p className="text-xs text-gray-500 mt-1">Just now</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Benefits List */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                {[
                  {
                    icon: <Zap className="w-6 h-6 text-blue-500" />,
                    title: "Instant Notifications",
                    description: "Get real-time updates when providers respond to your tasks"
                  },
                  {
                    icon: <Shield className="w-6 h-6 text-green-500" />,
                    title: "Call Center Verification",
                    description: "All providers are verified by our 24/7 call center team"
                  },
                  {
                    icon: <MapPin className="w-6 h-6 text-purple-500" />,
                    title: "Location Privacy",
                    description: "Your address is only shared after provider verification"
                  },
                  {
                    icon: <Clock className="w-6 h-6 text-orange-500" />,
                    title: "Quick Matching",
                    description: "Find providers within 6-10km of your location instantly"
                  }
                ].map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-start space-x-4"
                  >
                    <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      {benefit.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">{benefit.title}</h4>
                      <p className="text-gray-600">{benefit.description}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-blue-700 text-white relative overflow-hidden">
        {/* Animated Background Shapes */}
        <div className="absolute inset-0">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
            className="absolute -top-24 -left-24 w-48 h-48 border border-white/10 rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-24 -right-24 w-64 h-64 border border-white/10 rounded-full"
          />
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied customers who trust FindMyHelper for all their service needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={() => setLocation('/client-dashboard')}
                    size="lg"
                    className="bg-white text-primary hover:bg-white/90 font-semibold py-4 px-8 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
              ) : (
                <>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={() => setAuthDialogOpen(true)}
                      size="lg"
                      className="bg-white text-primary hover:bg-white/90 font-semibold py-4 px-8 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      Start as Client
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={() => setAuthDialogOpen(true)}
                      variant="outline"
                      size="lg"
                      className="border-white/30 text-white hover:bg-white/10 font-semibold py-4 px-8 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      Become a Provider
                    </Button>
                  </motion.div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Authentication Dialog */}
      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle className="sr-only">Authentication</DialogTitle>
          <DialogDescription className="sr-only">
            Sign in or create an account to get started
          </DialogDescription>
          <AuthPage 
            isModal={true} 
            onClose={() => setAuthDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Onboarding Walkthrough */}
      <OnboardingWalkthrough
        isOpen={onboardingOpen}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />

      {/* Tour Button for testing/demo */}
      {!onboardingOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1 }}
          className="fixed bottom-6 right-6 z-40"
        >
          <Button
            onClick={() => setOnboardingOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-full p-4"
            size="lg"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Take a Tour
          </Button>
        </motion.div>
      )}
    </MainLayout>
  );
}