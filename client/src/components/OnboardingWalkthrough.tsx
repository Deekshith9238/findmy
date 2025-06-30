import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  MapPin, 
  Search, 
  Bell, 
  Shield,
  CheckCircle,
  Star,
  Users,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  characterMessage: string;
  actionRequired?: boolean;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to FindMyHelper!',
    description: 'I\'m Helper, your friendly guide! Let me show you around our amazing platform where you can find trusted service providers for any task.',
    icon: <Sparkles className="w-6 h-6" />,
    position: 'center',
    characterMessage: 'Hi there! Ready for an exciting tour? 🎉'
  },
  {
    id: 'search',
    title: 'Find Your Perfect Helper',
    description: 'Use our smart search to find service providers by category and location. We\'ll match you with verified professionals nearby!',
    icon: <Search className="w-6 h-6" />,
    target: 'search-section',
    position: 'bottom',
    characterMessage: 'This is where the magic begins! ✨'
  },
  {
    id: 'location',
    title: 'Location-Based Matching',
    description: 'We use your location to find helpers within 6-10km of you. Don\'t worry - your exact address stays private until you approve a provider!',
    icon: <MapPin className="w-6 h-6" />,
    target: 'location-input',
    position: 'top',
    characterMessage: 'Privacy first, convenience always! 🛡️'
  },
  {
    id: 'categories',
    title: 'Browse Service Categories',
    description: 'From home cleaning to repairs, we have trusted professionals for every need. Each category has verified experts ready to help!',
    icon: <Users className="w-6 h-6" />,
    target: 'categories',
    position: 'top',
    characterMessage: 'So many helpful services to choose from! 🔧'
  },
  {
    id: 'notifications',
    title: 'Real-Time Updates',
    description: 'Get instant notifications when providers respond to your tasks. Stay in the loop throughout the entire process!',
    icon: <Bell className="w-6 h-6" />,
    target: 'notifications',
    position: 'bottom',
    characterMessage: 'Never miss an update with our smart alerts! 🔔'
  },
  {
    id: 'verification',
    title: 'Call Center Protection',
    description: 'Our 24/7 call center verifies every provider before sharing your contact details. Your safety is our top priority!',
    icon: <Shield className="w-6 h-6" />,
    target: 'verification',
    position: 'top',
    characterMessage: 'We\'ve got your back every step of the way! 💪'
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Ready to find your perfect helper? Create your first task or browse our amazing service providers. Welcome to the FindMyHelper family!',
    icon: <CheckCircle className="w-6 h-6" />,
    position: 'center',
    characterMessage: 'Adventure awaits! Let\'s find you some help! 🚀'
  }
];

interface CharacterProps {
  message: string;
  position?: { x: number; y: number };
}

const Character = ({ message, position }: CharacterProps) => {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      exit={{ scale: 0, rotate: 180 }}
      transition={{ type: "spring", duration: 0.6 }}
      className="absolute z-50"
      style={{
        left: position?.x || '50%',
        top: position?.y || '20%',
        transform: position ? 'none' : 'translateX(-50%)'
      }}
    >
      {/* Character Avatar */}
      <div className="relative">
        <motion.div
          animate={{ 
            y: [-5, 5, -5],
            rotate: [-2, 2, -2]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg border-4 border-white"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
        </motion.div>
        
        {/* Speech Bubble */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="absolute -top-16 left-1/2 transform -translate-x-1/2 w-48"
        >
          <div className="bg-white rounded-lg p-3 shadow-lg border border-gray-200 relative">
            <p className="text-sm text-gray-700 font-medium">{message}</p>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b border-gray-200"></div>
          </div>
        </motion.div>

        {/* Sparkle Effects */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-yellow-400 rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              top: `${10 + i * 10}%`,
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

interface OnboardingWalkthroughProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export default function OnboardingWalkthrough({ isOpen, onComplete, onSkip }: OnboardingWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [characterPosition, setCharacterPosition] = useState<{ x: number; y: number } | undefined>();
  const { user } = useAuth();

  // Filter steps based on user login status
  const availableSteps = onboardingSteps.filter(step => {
    // Skip notifications step if user is not logged in (since notifications only appear when logged in)
    if (step.id === 'notifications' && !user) {
      return false;
    }
    return true;
  });

  const step = availableSteps[currentStep];

  useEffect(() => {
    if (!isOpen || !step?.target) {
      setTargetElement(null);
      setCharacterPosition(undefined);
      return;
    }

    // Add a small delay to ensure DOM is ready
    const timeout = setTimeout(() => {
      const element = document.querySelector(`[data-onboarding="${step.target}"]`) as HTMLElement;
      setTargetElement(element);

      if (element) {
        // Calculate character position relative to target
        const rect = element.getBoundingClientRect();
        const characterX = rect.left + rect.width / 2;
        const characterY = step.position === 'top' ? rect.top - 100 : rect.bottom + 20;
        setCharacterPosition({ x: characterX, y: characterY });
      } else if (step.target) {
        // If target element is not found, scroll to find it or skip to next step
        console.warn(`Target element [data-onboarding="${step.target}"] not found`);
        // Try scrolling to reveal the element
        const scrollTarget = document.getElementById(step.target) || 
                           document.querySelector(`#${step.target}`) ||
                           document.querySelector(`[data-testid="${step.target}"]`);
        
        if (scrollTarget) {
          scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Retry after scroll with multiple attempts
          let retryCount = 0;
          const maxRetries = 5;
          const retryInterval = setInterval(() => {
            retryCount++;
            const retryElement = document.querySelector(`[data-onboarding="${step.target}"]`) as HTMLElement;
            
            if (retryElement) {
              setTargetElement(retryElement);
              const rect = retryElement.getBoundingClientRect();
              const characterX = rect.left + rect.width / 2;
              const characterY = step.position === 'top' ? rect.top - 100 : rect.bottom + 20;
              setCharacterPosition({ x: characterX, y: characterY });
              clearInterval(retryInterval);
            } else if (retryCount >= maxRetries) {
              console.warn(`Could not find target element after ${maxRetries} retries`);
              clearInterval(retryInterval);
            }
          }, 200);
        }
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [currentStep, step?.target, isOpen]);

  const nextStep = () => {
    if (currentStep < availableSteps.length - 1) {
      // Reset target element when moving to next step
      setTargetElement(null);
      setCharacterPosition(undefined);
      
      // Small delay to ensure smooth transition
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
      }, 100);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      // Reset target element when moving to previous step
      setTargetElement(null);
      setCharacterPosition(undefined);
      
      // Small delay to ensure smooth transition
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
      }, 100);
    }
  };

  const getTooltipPosition = () => {
    // Default center position for steps without targets or when target is not found
    if (!targetElement || !step?.position) {
      return { 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)',
        position: 'fixed' as const
      };
    }

    const rect = targetElement.getBoundingClientRect();
    const tooltipWidth = 384;
    const tooltipHeight = 200;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate base position
    let basePosition;
    switch (step.position) {
      case 'top':
        basePosition = {
          top: rect.top - tooltipHeight - 20,
          left: rect.left + rect.width / 2 - tooltipWidth / 2,
        };
        break;
      case 'bottom':
        basePosition = {
          top: rect.bottom + 20,
          left: rect.left + rect.width / 2 - tooltipWidth / 2,
        };
        break;
      case 'left':
        basePosition = {
          top: rect.top + rect.height / 2 - tooltipHeight / 2,
          left: rect.left - tooltipWidth - 20,
        };
        break;
      case 'right':
        basePosition = {
          top: rect.top + rect.height / 2 - tooltipHeight / 2,
          left: rect.right + 20,
        };
        break;
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          position: 'fixed' as const
        };
    }

    // Adjust for viewport boundaries
    const adjustedLeft = Math.max(20, Math.min(basePosition.left, viewportWidth - tooltipWidth - 20));
    const adjustedTop = Math.max(20, Math.min(basePosition.top, viewportHeight - tooltipHeight - 20));

    return {
      top: adjustedTop,
      left: adjustedLeft,
      transform: 'none',
      position: 'fixed' as const
    };
  };

  if (!isOpen || !step) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
        />

        {/* Spotlight effect on target element */}
        {targetElement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute pointer-events-none"
            style={{
              left: targetElement.getBoundingClientRect().left - 10,
              top: targetElement.getBoundingClientRect().top - 10,
              width: targetElement.getBoundingClientRect().width + 20,
              height: targetElement.getBoundingClientRect().height + 20,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
              borderRadius: '8px',
            }}
          />
        )}

        {/* Character */}
        <Character 
          message={step.characterMessage} 
          position={step.position === 'center' || !targetElement ? undefined : characterPosition}
        />

        {/* Tooltip */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed"
          style={getTooltipPosition()}
        >
          <Card className="w-96 shadow-xl border-2 border-primary/20">
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    {step.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {step.title}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSkip}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Content */}
              <p className="text-gray-600 mb-6 leading-relaxed">
                {step.description}
              </p>

              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>Step {currentStep + 1} of {availableSteps.length}</span>
                  <span>{Math.round(((currentStep + 1) / availableSteps.length) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="bg-primary h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentStep + 1) / availableSteps.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </Button>

                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    onClick={onSkip}
                    className="text-gray-500"
                  >
                    Skip Tour
                  </Button>
                  <Button
                    onClick={nextStep}
                    className="flex items-center space-x-2"
                  >
                    <span>{currentStep === availableSteps.length - 1 ? 'Get Started' : 'Next'}</span>
                    {currentStep === availableSteps.length - 1 ? (
                      <Star className="w-4 h-4" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}