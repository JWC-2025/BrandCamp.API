export interface IndustryTemplate {
  industry: string;
  keywords: string[];
  focusAreas: string[];
  specificCriteria: {
    valueProposition: string;
    features: string;
    cta: string;
    seo: string;
    trust: string;
  };
}

export const industryTemplates: Record<string, IndustryTemplate> = {
  ecommerce: {
    industry: 'E-commerce/Retail',
    keywords: ['buy', 'shop', 'cart', 'checkout', 'product', 'price', 'shipping', 'reviews'],
    focusAreas: ['product presentation', 'checkout flow', 'trust signals', 'reviews/ratings', 'shipping info'],
    specificCriteria: {
      valueProposition: `
      For E-commerce sites, evaluate:
      - Product value proposition clarity
      - Competitive pricing presentation
      - Unique selling points vs competitors
      - Brand differentiation in crowded market
      - Customer value communication (savings, quality, convenience)
      `,
      features: `
      Focus on e-commerce specific features:
      - Product catalog organization and navigation
      - Search and filtering capabilities
      - Product comparison tools
      - Wishlist/favorites functionality
      - Mobile shopping experience
      - Product recommendations
      `,
      cta: `
      E-commerce CTA analysis should cover:
      - "Add to Cart" button prominence and clarity
      - Checkout flow optimization
      - Guest checkout options
      - Multiple payment methods visibility
      - Urgency/scarcity indicators
      - Cross-sell/upsell CTAs
      `,
      seo: `
      E-commerce SEO focus:
      - Product page optimization
      - Category page structure
      - Schema markup for products/reviews
      - Breadcrumb navigation
      - URL structure for products
      - Meta descriptions for commercial intent
      `,
      trust: `
      E-commerce trust signals:
      - Customer reviews and ratings
      - Security badges and SSL certificates
      - Return/refund policies
      - Customer service contact info
      - Social proof (testimonials, user photos)
      - Payment security indicators
      `
    }
  },
  
  saas: {
    industry: 'SaaS/Software',
    keywords: ['software', 'platform', 'solution', 'trial', 'demo', 'subscription', 'features', 'integration'],
    focusAreas: ['feature communication', 'pricing transparency', 'trial/demo CTAs', 'integration capabilities'],
    specificCriteria: {
      valueProposition: `
      For SaaS platforms, evaluate:
      - Problem-solution fit clarity
      - Unique feature differentiation
      - ROI and business value proposition
      - Time-to-value communication
      - Scalability messaging
      `,
      features: `
      SaaS feature analysis:
      - Core functionality presentation
      - Integration capabilities highlight
      - Scalability and customization options
      - Security and compliance features
      - API and developer resources
      - Feature comparison with competitors
      `,
      cta: `
      SaaS CTA optimization:
      - Free trial/demo prominence
      - Sign-up flow simplicity
      - Pricing page accessibility
      - Contact sales CTAs
      - Resource download CTAs
      - Webinar/demo booking
      `,
      seo: `
      SaaS SEO considerations:
      - Solution-focused keyword targeting
      - Feature page optimization
      - Integration and use case pages
      - Comparison pages for competitors
      - Help documentation structure
      - Industry-specific landing pages
      `,
      trust: `
      SaaS trust indicators:
      - Customer testimonials and case studies
      - Security certifications (SOC2, GDPR)
      - Uptime/reliability guarantees
      - Customer support availability
      - Company information and team
      - Industry awards and recognitions
      `
    }
  },
  
  services: {
    industry: 'Professional Services',
    keywords: ['services', 'consulting', 'expertise', 'experience', 'professional', 'solutions', 'contact'],
    focusAreas: ['expertise communication', 'case studies', 'contact accessibility', 'credibility building'],
    specificCriteria: {
      valueProposition: `
      For service businesses, evaluate:
      - Expertise and specialization clarity
      - Unique methodology or approach
      - Results and outcomes focus
      - Industry experience communication
      - Personal/team credibility
      `,
      features: `
      Service offering presentation:
      - Service portfolio clarity
      - Process and methodology explanation
      - Deliverables and timeline communication
      - Customization and flexibility
      - Industry specializations
      - Team expertise highlighting
      `,
      cta: `
      Service business CTAs:
      - Contact/consultation request prominence
      - Quote or estimate requests
      - Portfolio/case study access
      - Resource downloads (whitepapers, guides)
      - Meeting/call scheduling
      - Newsletter or insight subscriptions
      `,
      seo: `
      Service business SEO:
      - Local SEO optimization
      - Service-specific page optimization
      - Industry expertise content
      - Case study and portfolio SEO
      - Professional bio optimization
      - Location-based targeting
      `,
      trust: `
      Service business trust signals:
      - Client testimonials and case studies
      - Professional certifications
      - Industry association memberships
      - Awards and recognitions
      - Team credentials and experience
      - Client logos and partnerships
      `
    }
  },
  
  healthcare: {
    industry: 'Healthcare/Medical',
    keywords: ['health', 'medical', 'treatment', 'care', 'patient', 'doctor', 'clinic', 'appointment'],
    focusAreas: ['credibility', 'patient care', 'accessibility', 'compliance', 'appointment booking'],
    specificCriteria: {
      valueProposition: `
      For healthcare websites, evaluate:
      - Patient care quality emphasis
      - Medical expertise and specializations
      - Treatment outcome focus
      - Patient experience differentiation
      - Accessibility and convenience
      `,
      features: `
      Healthcare feature analysis:
      - Online appointment booking
      - Patient portal access
      - Telehealth capabilities
      - Insurance and payment options
      - Location and hours information
      - Emergency contact information
      `,
      cta: `
      Healthcare CTA evaluation:
      - Appointment scheduling prominence
      - Emergency contact visibility
      - Patient portal login access
      - Insurance verification requests
      - Consultation or second opinion requests
      - Health resource access
      `,
      seo: `
      Healthcare SEO focus:
      - Medical condition and treatment pages
      - Local SEO for medical practices
      - Provider and specialty optimization
      - Health information content
      - HIPAA-compliant content structure
      - Medical schema markup
      `,
      trust: `
      Healthcare trust indicators:
      - Medical credentials and board certifications
      - Hospital affiliations
      - Patient reviews and testimonials
      - Insurance acceptance
      - Privacy policy and HIPAA compliance
      - Medical association memberships
      `
    }
  },
  
  education: {
    industry: 'Education/Training',
    keywords: ['education', 'course', 'learning', 'training', 'certification', 'students', 'program'],
    focusAreas: ['curriculum quality', 'instructor credentials', 'outcomes/results', 'enrollment process'],
    specificCriteria: {
      valueProposition: `
      For educational websites, evaluate:
      - Learning outcomes and career benefits
      - Curriculum quality and relevance
      - Instructor expertise and credentials
      - Unique teaching methodology
      - Student success and job placement rates
      `,
      features: `
      Education feature assessment:
      - Course catalog and descriptions
      - Learning management system access
      - Student resources and support
      - Certification and accreditation info
      - Career services and job placement
      - Financial aid and payment options
      `,
      cta: `
      Educational CTA analysis:
      - Course enrollment prominence
      - Information request forms
      - Consultation or advising appointments
      - Campus visit scheduling
      - Application process initiation
      - Free course or content access
      `,
      seo: `
      Education SEO considerations:
      - Program and course optimization
      - Career outcome keyword targeting
      - Location-based education searches
      - Accreditation and certification content
      - Student resource optimization
      - Faculty and expertise pages
      `,
      trust: `
      Educational trust signals:
      - Accreditation and certifications
      - Student testimonials and success stories
      - Faculty credentials and experience
      - Job placement rates and outcomes
      - Industry partnerships and connections
      - Awards and recognitions
      `
    }
  },
  
  nonprofit: {
    industry: 'Non-profit/Charity',
    keywords: ['donate', 'volunteer', 'mission', 'cause', 'impact', 'community', 'support', 'charity'],
    focusAreas: ['mission clarity', 'impact demonstration', 'donation process', 'volunteer engagement'],
    specificCriteria: {
      valueProposition: `
      For non-profit organizations, evaluate:
      - Mission and cause clarity
      - Impact and outcomes communication
      - Donor value proposition
      - Community benefit articulation
      - Organizational credibility and transparency
      `,
      features: `
      Non-profit feature analysis:
      - Mission and program information
      - Impact metrics and reporting
      - Volunteer opportunities and sign-up
      - Event listings and participation
      - Newsletter and communication signup
      - Resource and education materials
      `,
      cta: `
      Non-profit CTA evaluation:
      - Donation button prominence and ease
      - Volunteer signup accessibility
      - Event registration CTAs
      - Newsletter and update subscriptions
      - Contact and involvement opportunities
      - Social sharing and advocacy CTAs
      `,
      seo: `
      Non-profit SEO focus:
      - Mission and cause-related keywords
      - Local community optimization
      - Impact and program content
      - Volunteer opportunity optimization
      - Grant and funding content
      - Community event optimization
      `,
      trust: `
      Non-profit trust indicators:
      - Financial transparency and charity ratings
      - Board member and leadership information
      - Annual reports and impact statements
      - Donor testimonials and stories
      - Partnership and collaboration mentions
      - Recognition and awards
      `
    }
  },
  
  realestate: {
    industry: 'Real Estate',
    keywords: ['property', 'home', 'buy', 'sell', 'rent', 'agent', 'realtor', 'listing'],
    focusAreas: ['property listings', 'agent credentials', 'local expertise', 'contact accessibility'],
    specificCriteria: {
      valueProposition: `
      For real estate websites, evaluate:
      - Local market expertise
      - Agent experience and track record
      - Service differentiation
      - Client success and satisfaction
      - Market knowledge and insights
      `,
      features: `
      Real estate feature analysis:
      - Property search and filtering
      - Virtual tours and photo galleries
      - Neighborhood and market information
      - Mortgage and financing resources
      - Agent profiles and contact info
      - Market reports and analytics
      `,
      cta: `
      Real estate CTA evaluation:
      - Property inquiry and contact forms
      - Agent contact and consultation requests
      - Property valuation requests
      - Newsletter and market update signups
      - Virtual tour scheduling
      - Buyer/seller consultation booking
      `,
      seo: `
      Real estate SEO considerations:
      - Local area and neighborhood optimization
      - Property type and feature targeting
      - Agent and brokerage optimization
      - Market condition and trend content
      - Community and lifestyle content
      - Property listing optimization
      `,
      trust: `
      Real estate trust signals:
      - Agent licenses and certifications
      - Client testimonials and reviews
      - Sales history and track record
      - Professional association memberships
      - Awards and recognitions
      - Local community involvement
      `
    }
  }
};

export function detectIndustry(websiteData: { html: string; metadata: { title: string; description: string } }): string {
  const content = `${websiteData.metadata.title} ${websiteData.metadata.description} ${websiteData.html}`.toLowerCase();
  
  let bestMatch = 'general';
  let highestScore = 0;
  
  for (const [industry, template] of Object.entries(industryTemplates)) {
    const score = template.keywords.reduce((acc, keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = content.match(regex);
      return acc + (matches ? matches.length : 0);
    }, 0);
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = industry;
    }
  }
  
  return bestMatch;
}

export function getIndustryPrompt(industry: string, evaluationType: string): string {
  const template = industryTemplates[industry];
  if (!template) return '';
  
  switch (evaluationType.toLowerCase()) {
    case 'value proposition':
    case 'valueproposition':
      return template.specificCriteria.valueProposition;
    case 'features':
    case 'featuresandbenefits':
    case 'features and benefits':
      return template.specificCriteria.features;
    case 'cta':
    case 'ctaanalysis':
    case 'call-to-action':
      return template.specificCriteria.cta;
    case 'seo':
    case 'seoreadiness':
      return template.specificCriteria.seo;
    case 'trust':
    case 'trustsignals':
    case 'trust signals':
      return template.specificCriteria.trust;
    default:
      return '';
  }
}