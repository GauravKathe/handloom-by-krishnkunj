import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ() {
  const faqs = [
    {
      question: "What are your shipping charges?",
      answer: "We offer free shipping on all orders across India. Your beautiful handloom saree will be delivered to your doorstep without any additional shipping charges."
    },
    {
      question: "How long does delivery take?",
      answer: "We typically process and ship orders within 2-3 business days. Delivery usually takes 5-7 business days depending on your location. You will receive tracking information once your order is shipped."
    },
    {
      question: "What is your exchange policy?",
      answer: "We offer exchanges within 7 days of delivery. Please note that we do not offer returns, only exchanges. The product should be unused, unwashed, and in original condition with all tags intact. Visit our Returns & Exchange page for more details."
    },
    {
      question: "Are the colors shown online accurate?",
      answer: "We make every effort to display colors as accurately as possible. However, the actual color may vary slightly due to different monitor settings and lighting conditions. All our sarees are handloom products, so slight variations in color and weave are natural characteristics that make each piece unique."
    },
    {
      question: "How do I care for my handloom saree?",
      answer: "We recommend dry cleaning for the first wash. Subsequently, you can hand wash with mild detergent in cold water. Avoid wringing and dry in shade. Iron on medium heat when the saree is slightly damp for best results."
    },
    {
      question: "Do you accept custom orders?",
      answer: "Yes, we do accept custom orders for specific designs, colors, or weaving patterns. Please contact us via WhatsApp or email with your requirements, and our team will get back to you with details and pricing."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major payment methods including Credit/Debit Cards, UPI, Net Banking, and Cash on Delivery (COD) for select locations."
    },
    {
      question: "How can I track my order?",
      answer: "Once your order is shipped, you will receive a tracking number via email and SMS. You can use this number to track your shipment on our courier partner's website."
    },
    {
      question: "What if I receive a damaged product?",
      answer: "We take utmost care in packaging, but if you receive a damaged product, please contact us immediately with photos. We will arrange for an exchange or resolution within 24-48 hours."
    },
    {
      question: "Are all your sarees handloom?",
      answer: "Yes, all our sarees are authentic handloom products crafted by skilled artisans. Each piece is unique and reflects the traditional craftsmanship of Indian weaving."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-muted-foreground">
              Find answers to common questions about our products, orders, and services
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-12 p-6 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg text-center">
            <h2 className="text-xl font-semibold mb-2">Still have questions?</h2>
            <p className="text-muted-foreground mb-4">
              We're here to help! Contact us through WhatsApp or email and we'll respond as soon as possible.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a
                href="https://wa.me/919730142172"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                WhatsApp Us
              </a>
              <a
                href="mailto:contact@handloombykrishnkunj.com"
                className="inline-flex items-center justify-center px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Email Us
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
