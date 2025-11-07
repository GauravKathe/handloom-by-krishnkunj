import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, Eye, FileText, UserCheck, AlertCircle } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              Privacy Policy
            </h1>
            <p className="text-lg text-muted-foreground">
              Last updated: January 2025
            </p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 md:p-8">
                <p className="text-muted-foreground mb-4">
                  At Handloom by Krishnkunj, we are committed to protecting your privacy and ensuring 
                  the security of your personal information. This Privacy Policy explains how we collect, 
                  use, disclose, and safeguard your information when you visit our website.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start gap-4 mb-4">
                  <FileText className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Personal Information</h3>
                        <p className="text-muted-foreground">
                          We collect information that you provide directly to us, including:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mt-2">
                          <li>Name and contact information (email, phone number)</li>
                          <li>Shipping and billing addresses</li>
                          <li>Payment information (processed securely through payment gateways)</li>
                          <li>Order history and preferences</li>
                          <li>Account credentials</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Automatically Collected Information</h3>
                        <p className="text-muted-foreground">
                          When you visit our website, we may automatically collect:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mt-2">
                          <li>Browser type and version</li>
                          <li>Device information</li>
                          <li>IP address</li>
                          <li>Pages visited and time spent on pages</li>
                          <li>Referring website addresses</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start gap-4 mb-4">
                  <Eye className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
                    <p className="text-muted-foreground mb-2">
                      We use the collected information for various purposes:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                      <li>Process and fulfill your orders</li>
                      <li>Communicate with you about your orders and account</li>
                      <li>Send promotional emails and updates (with your consent)</li>
                      <li>Improve our website and customer service</li>
                      <li>Prevent fraud and enhance security</li>
                      <li>Comply with legal obligations</li>
                      <li>Analyze website usage and trends</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start gap-4 mb-4">
                  <Lock className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h2 className="text-2xl font-semibold mb-4">Information Security</h2>
                    <p className="text-muted-foreground mb-2">
                      We implement appropriate technical and organizational security measures to protect 
                      your personal information:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                      <li>Secure Socket Layer (SSL) encryption for data transmission</li>
                      <li>Secure payment processing through trusted payment gateways</li>
                      <li>Regular security audits and updates</li>
                      <li>Restricted access to personal information</li>
                      <li>Employee training on data protection</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start gap-4 mb-4">
                  <UserCheck className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
                    <p className="text-muted-foreground mb-2">You have the right to:</p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                      <li>Access your personal information</li>
                      <li>Correct inaccurate or incomplete information</li>
                      <li>Request deletion of your personal information</li>
                      <li>Opt-out of marketing communications</li>
                      <li>Object to processing of your personal information</li>
                      <li>Request data portability</li>
                    </ul>
                    <p className="text-muted-foreground mt-4">
                      To exercise these rights, please contact us at contact@handloombykrishnkunj.com
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 md:p-8">
                <h2 className="text-2xl font-semibold mb-4">Cookies and Tracking</h2>
                <p className="text-muted-foreground mb-2">
                  We use cookies and similar tracking technologies to enhance your browsing experience:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li><strong>Essential Cookies:</strong> Required for website functionality</li>
                  <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our site</li>
                  <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  You can control cookies through your browser settings.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 md:p-8">
                <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
                <p className="text-muted-foreground mb-2">
                  We may share your information with trusted third parties:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li><strong>Payment Processors:</strong> To process secure payments</li>
                  <li><strong>Shipping Partners:</strong> To deliver your orders</li>
                  <li><strong>Email Service Providers:</strong> To send order confirmations and updates</li>
                  <li><strong>Analytics Services:</strong> To improve our website performance</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  These third parties are contractually obligated to protect your information and use it 
                  only for the purposes we specify.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 md:p-8">
                <h2 className="text-2xl font-semibold mb-4">Children's Privacy</h2>
                <p className="text-muted-foreground">
                  Our website is not intended for children under 18 years of age. We do not knowingly 
                  collect personal information from children. If you believe we have collected information 
                  from a child, please contact us immediately.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 md:p-8">
                <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
                <p className="text-muted-foreground">
                  We retain your personal information for as long as necessary to fulfill the purposes 
                  outlined in this policy, unless a longer retention period is required by law. Order 
                  information is typically retained for 7 years for accounting and legal purposes.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 md:p-8">
                <h2 className="text-2xl font-semibold mb-4">Changes to Privacy Policy</h2>
                <p className="text-muted-foreground">
                  We may update this Privacy Policy from time to time. We will notify you of any changes 
                  by posting the new policy on this page and updating the "Last updated" date. We encourage 
                  you to review this policy periodically.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <AlertCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h2 className="text-xl font-semibold mb-2">Contact Us</h2>
                    <p className="text-muted-foreground mb-4">
                      If you have any questions about this Privacy Policy or our data practices, please contact us:
                    </p>
                    <div className="space-y-2 text-muted-foreground">
                      <p>
                        <strong>Email:</strong> contact@handloombykrishnkunj.com
                      </p>
                      <p>
                        <strong>Phone:</strong> +91 9730142172
                      </p>
                      <p>
                        <strong>Address:</strong> Balaji Krupa, Kanadi Lane, DG Road, Yeola, 
                        District Nashik - 423401, Maharashtra, India
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}