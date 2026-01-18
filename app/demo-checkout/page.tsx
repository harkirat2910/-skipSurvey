'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import * as Sentry from '@sentry/nextjs';

import styles from './checkout.module.css';
import headphonesImg from '@/components/assets/headphones.jpg';
import monitorImg from '@/components/assets/97324.jpg';
import { FrictionDetector } from '@/lib/friction';
import AvatarWidget from '@/components/AvatarWidget';
import SentryManualLoader from '@/components/SentryManualLoader';
import { getSessionId } from '@/lib/session';
import { tracker } from '@/lib/tracker';
import { submitCartRevisitAnswer, submitShippingCostAnswer } from '@/lib/surveymonkey-responses';

export default function CheckoutPage() {
  const [step, setStep] = useState(1);
  const [coupon, setCoupon] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [trigger, setTrigger] = useState<{ type: string } | null>(null);
  const [deliveryOption, setDeliveryOption] = useState('standard');

  // Survey Pop-up State
  const [showRevisitPopup, setShowRevisitPopup] = useState(false);
  const [showShippingPopup, setShowShippingPopup] = useState(false);
  const [toggleHistory, setToggleHistory] = useState<number[]>([]);

  const ITEMS_SUBTOTAL = 349.98;
  const TAX = 45.50;

  const getShippingCost = () => {
    switch (deliveryOption) {
      case 'expedited': return 15.08;
      case 'priority': return 19.08;
      default: return 0.00;
    }
  };

  const shippingCost = getShippingCost();
  const totalCost = (ITEMS_SUBTOTAL + TAX + shippingCost).toFixed(2);


  useEffect(() => {
    // Generate a session ID for the silent survey analytics
    const sessionId = getSessionId();

    // Tag the Sentry scope
    // Sentry.setTag("silent_session_id", sessionId);
    // Sentry.setTag("flow", "demo_checkout");

    console.log(`Silent Survey Session Initialized: ${sessionId}`);
    // Init Friction Detection
    new FrictionDetector((event) => {
      console.log('UI Friction Detected!', event);
      setTrigger({ type: event.trigger_type });
    });

    // Track page view
    tracker.track('nav', { from: 'start' });

  }, []);

  // Cart Revisit Detection
  useEffect(() => {
    if (step === 1) {
      // Check if user has visited cart before
      const hasVisited = localStorage.getItem('cart_visited');
      const hasLeft = localStorage.getItem('cart_left');

      if (hasVisited && hasLeft) {
        // User is revisiting - show pop-up after a short delay
        const timer = setTimeout(() => {
          setShowRevisitPopup(true);
        }, 1500);

        // Clear the 'left' flag so pop-up only shows once per revisit
        localStorage.removeItem('cart_left');

        return () => clearTimeout(timer);
      } else {
        // First visit to cart
        localStorage.setItem('cart_visited', 'true');
      }
    } else if (step === 2 && localStorage.getItem('cart_visited')) {
      // User left cart (moved to step 2)
      localStorage.setItem('cart_left', 'true');
    }
  }, [step]);

  // Radio Toggle Tracking
  useEffect(() => {
    if (step === 2) {
      // Track toggle timestamp
      const now = Date.now();
      const newHistory = [...toggleHistory, now];

      // Filter to last 10 seconds
      const recentToggles = newHistory.filter(ts => now - ts < 10000);
      setToggleHistory(recentToggles);

      // If 3+ toggles in 10 seconds, show pop-up
      if (recentToggles.length >= 3 && !showShippingPopup) {
        setShowShippingPopup(true);
        setToggleHistory([]); // Reset to prevent multiple pop-ups
      }
    }
  }, [deliveryOption]);

  // Survey Response Handlers
  const handleRevisitYes = async () => {
    console.log('[Survey] Cart Revisit: Yes');
    await submitCartRevisitAnswer('yes');
  };

  const handleRevisitNo = async () => {
    console.log('[Survey] Cart Revisit: No');
    await submitCartRevisitAnswer('no');
  };

  const handleShippingYes = async () => {
    console.log('[Survey] Shipping Cost: Yes');
    await submitShippingCostAnswer('yes');
  };

  const handleShippingNo = async () => {
    console.log('[Survey] Shipping Cost: No');
    await submitShippingCostAnswer('no');
  };

  // Rage Click Logic: This function deliberately does nothing helpful
  const handleApplyCoupon = (e: React.MouseEvent) => {
    e.preventDefault();
    // Intentionally broken: No feedback, no state change, just consumption of the click
    console.log('Coupon button clicked - intentional no-op for demo');
  };

  const handlePlaceOrder = () => {
    setIsSuccess(true);
    // Emit success event for analytics/demo purposes
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('goal_complete', {
        detail: {
          revenue: parseFloat(totalCost),
          currency: 'CAD'
        }
      });
      window.dispatchEvent(event);

      // 10.1 Trigger Goal Completion
      tracker.track('goal_complete', {
        flow_name: 'demo_checkout',
        startedAt: (window as any)._sessionStart || Date.now() - 5000 // Fallback if start time not tracked
      });

      console.log('Order placed successfully. Event goal_complete emitted.');
    }
  };

  if (isSuccess) {
    return (
      <div className={styles.container}>
        <SentryManualLoader />
        <AvatarWidget />
        <div className={styles.navbar}>
          <div className={styles.logo}>Amazonia</div>
        </div>
        <div className={styles.successContainer}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.cardHeader}>Order placed, thanks!</h1>
          <p>Confirmation will be sent to your email.</p>
          <p style={{ marginTop: '20px' }}>
            <button
              className={styles.secondaryButton}
              onClick={() => { setIsSuccess(false); setStep(1); setDeliveryOption('standard'); }}
            >
              Start Over
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <SentryManualLoader />

      {/* Survey Widgets - Use AvatarWidget for survey questions */}
      {showRevisitPopup && (
        <AvatarWidget
          initiallyVisible={true}
          triggerType="survey_cart_revisit"
          surveyQuestion="Do you still want to purchase this?"
          onSurveyResponse={async (answer) => {
            await submitCartRevisitAnswer(answer);
            setShowRevisitPopup(false);
          }}
        />
      )}
      {showShippingPopup && (
        <AvatarWidget
          initiallyVisible={true}
          triggerType="survey_shipping_cost"
          surveyQuestion="Would you still buy this if we remove the shipping cost?"
          onSurveyResponse={async (answer) => {
            await submitShippingCostAnswer(answer);
            setShowShippingPopup(false);
          }}
        />
      )}

      {/* Regular friction detection avatar */}
      {!showRevisitPopup && !showShippingPopup && (
        <AvatarWidget initiallyVisible={!!trigger} triggerType={trigger?.type} />
      )}
      <div className={styles.navbar}>
        <div className={styles.logo}>Amazonia</div>
      </div>

      <div className={styles.mainContent}>

        {/* STEP 1: CART */}
        {step === 1 && (
          <>
            <div className={styles.leftColumn}>
              <div className={styles.card}>
                <h1 className={styles.cardHeader}>Shopping Cart</h1>
                <div className={styles.productRow}>
                  <div className={styles.productImagePlaceholder} style={{ background: 'white' }}>
                    <Image
                      src={headphonesImg}
                      alt="Wireless Noise Cancelling Headphones"
                      width={100}
                      height={100}
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                  <div className={styles.productDetails}>
                    <h3>Wireless Noise Cancelling Headphones</h3>
                    <div className={styles.stock}>In Stock</div>
                    <div>Eligible for FREE Shipping</div>
                    <div style={{ marginTop: '10px' }}>
                      <span style={{ color: '#565959', fontSize: '12px' }}>Qty:</span> 1
                    </div>
                  </div>
                  <div className={styles.productPrice}>$299.99</div>
                </div>
                <div className={styles.productRow}>
                  <div className={styles.productImagePlaceholder} style={{ background: 'white' }}>
                    <Image
                      src={monitorImg}
                      alt="4K Ultra HD Smart Monitor 27 inch"
                      width={100}
                      height={100}
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                  <div className={styles.productDetails}>
                    <h3>4K Ultra HD Smart Monitor 27"</h3>
                    <div className={styles.stock}>In Stock</div>
                    <div style={{ marginTop: '10px' }}>
                      <span style={{ color: '#565959', fontSize: '12px' }}>Qty:</span> 1
                    </div>
                  </div>
                  <div className={styles.productPrice}>$49.99</div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '18px' }}>
                  Subtotal (2 items): <b>${ITEMS_SUBTOTAL}</b>
                </div>
              </div>
            </div>
            <div className={styles.rightColumn}>
              <div className={styles.sidebarBox}>
                <div style={{ fontSize: '18px', marginBottom: '15px' }}>
                  Subtotal (2 items): <b style={{ color: '#B12704' }}>${ITEMS_SUBTOTAL}</b>
                </div>
                <button
                  className={styles.primaryButton}
                  onClick={() => setStep(2)}
                  data-testid="checkout-next-btn"
                >
                  Proceed to checkout
                </button>
              </div>
            </div>
          </>
        )}

        {/* STEP 2: REVIEW (Amazon Clone) */}
        {step === 2 && (
          <>
            <div className={styles.leftColumn}>

              {/* 1. Address */}
              <div className={styles.sectionHeader}>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div className={styles.sectionTitle} style={{ color: 'black', fontSize: '18px' }}>Delivering to H NAGPAL</div>
                  <div style={{ fontSize: '14px' }}>
                    211, 1541 Lycee Place, Ottawa, Ontario, K1G 4E2, Canada<br />
                    <span className={styles.link}>Add delivery instructions</span><br />
                    <span className={styles.link}>Pickup available nearby</span>
                  </div>
                </div>
                <div className={styles.link}>Change</div>
              </div>

              {/* 2. Payment */}
              <div className={styles.sectionHeader}>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div className={styles.sectionTitle} style={{ color: 'black', fontSize: '18px' }}>Paying with Visa 1354</div>
                  <div style={{ fontSize: '14px' }}>
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ fontWeight: 'bold' }}>Visa</span> ending in 4242 <br />
                      <span style={{ color: '#565959', fontSize: '12px' }}>Exp 10/28 | Harkirat Nagpal</span>
                    </div>

                    <h3 className={styles.subHeader} style={{ fontSize: '14px', color: '#000', marginBottom: '5px' }}>Gift Cards, Vouchers & Promotional Codes</h3>
                    <div className={styles.inputGroup} style={{ maxWidth: '400px' }}>
                      <input
                        type="text"
                        className={styles.promoInput}
                        placeholder="Enter a Code"
                        value={coupon}
                        onChange={(e) => setCoupon(e.target.value)}
                        data-testid="coupon-input"
                      />
                      <button
                        className={styles.secondaryButton}
                        style={{ width: 'auto' }}
                        onClick={handleApplyCoupon}
                        data-testid="coupon-apply-btn"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
                <div className={styles.link}>Change</div>
              </div>

              {/* 3. Warning Box */}
              <div className={styles.warningBox}>
                <div className={styles.warningIcon}>!</div>
                <div>
                  <div style={{ fontWeight: '700', color: '#B12704', fontSize: '14px' }}>Signature or one-time password required at time of delivery</div>
                  <div style={{ fontSize: '13px' }}>Please ensure someone will be physically present to provide the confidential one-time password or signature for this delivery in-person. <span className={styles.link}>Learn more.</span></div>
                </div>
              </div>

              {/* 4. Prime Banner */}
              <div className={styles.primeBanner}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <div style={{ fontSize: '24px' }}>📦</div>
                  <div>
                    <div style={{ fontWeight: '700', color: 'black' }}>Harkirat, enjoy 50% off Prime for Young Adults</div>
                    <div style={{ fontSize: '13px' }}>Save $19.08 and get FREE One-Day Delivery on eligible items.</div>
                  </div>
                </div>
                <button className={styles.secondaryButton} style={{ width: 'auto' }}>Get started</button>
              </div>

              {/* 5. Delivery Details */}
              <div className={styles.cardHeader} style={{ border: 'none', color: '#B12704', fontWeight: '700', fontSize: '18px' }}>
                Arriving Jan 19, 2026
              </div>

              {/* Item 1: Headphones */}
              <div className={styles.productRow} style={{ alignItems: 'start', border: 'none' }}>
                <div className={styles.productImagePlaceholder} style={{ background: 'white', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '50px' }}>🎧</div>
                </div>
                <div className={styles.productDetails} style={{ flex: 1 }}>
                  <div className={styles.itemTitle}>Wireless Noise Cancelling Headphones, Bluetooth 5.0, 30H Playtime</div>
                  <div className={styles.stock}>In Stock</div>
                  <div className={styles.itemPrice}>$299.99</div>
                  <div style={{ fontSize: '12px', color: '#565959', marginTop: '5px' }}>Sold by AudioTech</div>
                  <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                    <div style={{ border: '1px solid #ddd', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: '#e3e6e6' }}>Qty: 1</div>
                    <div className={styles.link}>Add gift options</div>
                  </div>
                </div>
                {/* Delivery Options (Only shown once per shipment usually, but duplicating for logic simplicity or keeping separate) 
                            User said "On changing the checkbox of delivery date, the delivery price should change" 
                            I will put the delivery options here next to the first item for the whole shipment.
                        */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', marginBottom: '10px' }}>Choose your delivery option:</div>
                  <label className={styles.deliveryOption}>
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryOption === 'standard'}
                      onChange={() => setDeliveryOption('standard')}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: deliveryOption === 'standard' ? '#007600' : 'black' }}>Wednesday, Jan 21</div>
                      <div style={{ fontSize: '12px', color: '#565959' }}>FREE Shipping</div>
                    </div>
                  </label>
                  <label className={styles.deliveryOption}>
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryOption === 'expedited'}
                      onChange={() => setDeliveryOption('expedited')}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: deliveryOption === 'expedited' ? '#007600' : 'black' }}>Monday, Jan 19</div>
                      <div style={{ fontSize: '12px', color: '#565959' }}>$15.08 - Expedited</div>
                    </div>
                  </label>
                  <label className={styles.deliveryOption}>
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryOption === 'priority'}
                      onChange={() => setDeliveryOption('priority')}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: deliveryOption === 'priority' ? '#007600' : 'black' }}>Tomorrow, Jan 18</div>
                      <div style={{ fontSize: '12px', color: '#565959' }}>$19.08 - Priority</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Item 2: Monitor */}
              <div className={styles.productRow} style={{ alignItems: 'start', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <div className={styles.productImagePlaceholder} style={{ background: 'white', width: '120px', height: '120px' }}>
                  <Image
                    src={monitorImg}
                    alt="4K Monitor"
                    width={120}
                    height={120}
                    style={{ objectFit: 'contain' }}
                  />
                </div>
                <div className={styles.productDetails} style={{ flex: 1 }}>
                  <div className={styles.itemTitle}>4K Ultra HD Smart Monitor 27", IPS Panel, 60Hz</div>
                  <div className={styles.stock}>In Stock</div>
                  <div className={styles.itemPrice}>$49.99</div>
                  <div style={{ fontSize: '12px', color: '#565959', marginTop: '5px' }}>Sold by ValuePixel</div>
                  <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                    <div style={{ border: '1px solid #ddd', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: '#e3e6e6' }}>Qty: 1</div>
                    <div className={styles.link}>Add gift options</div>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  {/* Empty space or shared delivery logic */}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                <a className={styles.link} onClick={() => setStep(1)} style={{ lineHeight: '40px' }}>Back to Cart</a>
              </div>
              <div style={{ fontSize: '11px', color: '#565959', marginTop: '10px' }}>
                By placing your order, you agree to Amazonia's <span className={styles.link}>privacy notice</span> and <span className={styles.link}>conditions of use</span>.
              </div>
            </div>

            <div className={styles.rightColumn}>
              <div className={styles.sidebarBox}>
                <button className={styles.placeOrderBtn} onClick={handlePlaceOrder} data-testid="place-order-btn">Place your order</button>
                <div style={{ fontSize: '11px', textAlign: 'center', color: '#565959', marginBottom: '15px' }}>
                  By placing your order, you agree to Amazonia's <span className={styles.link}>privacy notice</span> and <span className={styles.link}>conditions of use</span>.
                </div>

                <div style={{ borderBottom: '1px solid #d5d9d9', marginBottom: '10px' }}></div>

                <div className={styles.summaryRow}>
                  <div>Items (2):</div>
                  <div>${ITEMS_SUBTOTAL}</div>
                </div>
                <div className={styles.summaryRow}>
                  <div>Shipping & Handling:</div>
                  <div>${shippingCost.toFixed(2)}</div>
                </div>
                <div className={styles.summaryRow}>
                  <div>Total before tax:</div>
                  <div>${(ITEMS_SUBTOTAL + shippingCost).toFixed(2)}</div>
                </div>
                <div className={styles.summaryRow}>
                  <div>Estimated Tax:</div>
                  <div>${TAX.toFixed(2)}</div>
                </div>
                <div className={styles.totalRow}>
                  <div>Order Total:</div>
                  <div>${totalCost}</div>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
