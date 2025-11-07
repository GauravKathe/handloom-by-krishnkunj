import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PackageX, RefreshCw, Clock, ExternalLink } from "lucide-react";

export default function Returns() {
  const handleExchangeRequest = () => {
    window.open("https://docs.google.com/forms/d/e/1FAIpQLScxKqI_FXA6OBLQp4BKyvRw8P4Xjqbtklmwkm4wZxtq-4DRWA/viewform?usp=dialog", "_blank");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              Returns & Exchange Policy
            </h1>
            <p className="text-lg text-muted-foreground">
              We want you to love your handloom saree. Read our exchange policy below.
            </p>
          </div>

          <div className="space-y-6">
            <Card className="border-primary/20">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start gap-4 mb-4">
                  <PackageX className="h-8 w-8 text-primary flex-shrink-0" />
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">No Returns Policy</h2>
                    <p className="text-muted-foreground">
                      Due to the handcrafted nature of our products and hygiene considerations, 
                      we do not accept returns on sarees. All sales are final.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-secondary/20">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start gap-4 mb-6">
                  <RefreshCw className="h-8 w-8 text-secondary flex-shrink-0" />
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">Exchange Policy</h2>
                    <p className="text-muted-foreground mb-4">
                      We offer exchanges within 7 days of delivery for manufacturing defects, 
                      damage during transit, or incorrect items received.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <h3 className="font-semibold mb-2">Exchange Conditions:</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                      <li>Product must be unused, unwashed, and in original condition</li>
                      <li>All original tags and packaging must be intact</li>
                      <li>Valid only for manufacturing defects or damaged products</li>
                      <li>Exchange request must be made within 7 days of delivery</li>
                      <li>Product will be inspected before exchange approval</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Non-Exchangeable Items:</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                      <li>Products damaged due to misuse or improper care</li>
                      <li>Washed or altered sarees</li>
                      <li>Items with missing tags or packaging</li>
                      <li>Products purchased during special sales (unless defective)</li>
                    </ul>
                  </div>
                </div>

                <Button 
                  onClick={handleExchangeRequest}
                  size="lg"
                  className="w-full md:w-auto"
                >
                  <ExternalLink className="mr-2 h-5 w-5" />
                  Request Exchange
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start gap-4 mb-4">
                  <Clock className="h-8 w-8 text-primary flex-shrink-0" />
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">Exchange Process</h2>
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                          1
                        </div>
                        <div>
                          <p className="font-medium">Submit Exchange Request</p>
                          <p className="text-sm text-muted-foreground">
                            Fill out our exchange form with your order details and reason
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                          2
                        </div>
                        <div>
                          <p className="font-medium">Request Review</p>
                          <p className="text-sm text-muted-foreground">
                            Our team will review your request within 24-48 hours
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                          3
                        </div>
                        <div>
                          <p className="font-medium">Send Product Back</p>
                          <p className="text-sm text-muted-foreground">
                            Once approved, ship the product back to our address
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                          4
                        </div>
                        <div>
                          <p className="font-medium">Receive Replacement</p>
                          <p className="text-sm text-muted-foreground">
                            After inspection, we'll ship your replacement item
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-xl font-semibold mb-4">Shipping Address for Returns</h2>
                <p className="text-muted-foreground mb-2">
                  Handloom by Krishnkunj<br />
                  Balaji Krupa, Kanadi Lane<br />
                  DG Road, Yeola<br />
                  District Nashik - 423401<br />
                  Maharashtra, India
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Note: Shipping costs for exchanges may apply based on the reason for exchange.
                  For defective or incorrect items, we will cover the shipping costs.
                </p>
              </CardContent>
            </Card>

            <div className="text-center mt-8">
              <p className="text-muted-foreground mb-4">
                Have questions about our exchange policy?
              </p>
              <Button variant="outline" onClick={() => window.location.href = "/contact"}>
                Contact Customer Support
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}