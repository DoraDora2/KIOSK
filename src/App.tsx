import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import {
  basicSideDishOptions,
  categories,
  isSetMenu,
  menuItems,
  type BasicSideDish,
  type Category,
  type MenuItem,
} from "./menu";
import {
  estimateWaitMinutes,
  formatOrderTime,
  formatPrice,
  getCartCount,
  getCartItemKey,
  getCartTotal,
  getLineTotal,
  type CartItem,
} from "./utils";
import "./styles.css";

type PaymentMethod = "카드 결제" | "모바일 결제" | "현금 결제";

type CompletedOrder = {
  orderNumber: string;
  placedAt: Date;
  paymentMethod: PaymentMethod;
  totalCount: number;
  totalPrice: number;
  estimatedWait: number;
};

type FlyToCartAnimation = {
  id: number;
  image: string;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
};

const orderSequenceKey = "restaurant-kiosk-order-sequence";
const cartFlyDurationMs = 720;

function nextOrderNumber() {
  const savedSequence = window.localStorage.getItem(orderSequenceKey);
  const currentSequence = savedSequence ? Number(savedSequence) : 100;
  const nextSequence = Number.isNaN(currentSequence)
    ? 101
    : currentSequence + 1;

  window.localStorage.setItem(orderSequenceKey, String(nextSequence));

  return `A-${String(nextSequence).padStart(3, "0")}`;
}

function normalizeSelectedSideDishes(selectedSideDishes: BasicSideDish[]) {
  return [...selectedSideDishes].sort(
    (left, right) =>
      basicSideDishOptions.indexOf(left) - basicSideDishOptions.indexOf(right),
  );
}

function upsertCartItem(
  cartItems: CartItem[],
  cartItemToUpdate: Pick<CartItem, "item" | "selectedSideDishes">,
  delta: number,
) {
  const normalizedCartItem = {
    item: cartItemToUpdate.item,
    selectedSideDishes: normalizeSelectedSideDishes(
      cartItemToUpdate.selectedSideDishes,
    ),
  };
  const cartItemKey = getCartItemKey(normalizedCartItem);
  const nextCart = cartItems
    .map((cartItem) =>
      getCartItemKey(cartItem) === cartItemKey
        ? { ...cartItem, quantity: cartItem.quantity + delta }
        : cartItem,
    )
    .filter((cartItem) => cartItem.quantity > 0);

  const hasItem = nextCart.some(
    (cartItem) => getCartItemKey(cartItem) === cartItemKey,
  );

  if (!hasItem && delta > 0) {
    nextCart.push({ ...normalizedCartItem, quantity: delta });
  }

  return nextCart.sort(
    (left, right) => {
      const menuIndexDifference =
        menuItems.findIndex((menuItem) => menuItem.id === left.item.id) -
        menuItems.findIndex((menuItem) => menuItem.id === right.item.id);

      if (menuIndexDifference !== 0) {
        return menuIndexDifference;
      }

      return getCartItemKey(left).localeCompare(getCartItemKey(right), "ko-KR");
    },
  );
}

function App() {
  const [selectedCategory, setSelectedCategory] = useState<Category>(
    categories[0],
  );
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [flyToCartAnimations, setFlyToCartAnimations] = useState<
    FlyToCartAnimation[]
  >([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [pendingSetMenuItem, setPendingSetMenuItem] = useState<MenuItem | null>(
    null,
  );
  const [selectedBasicSideDishes, setSelectedBasicSideDishes] = useState<
    BasicSideDish[]
  >([]);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("카드 결제");
  const [completedOrder, setCompletedOrder] = useState<CompletedOrder | null>(
    null,
  );
  const cartPanelRef = useRef<HTMLElement | null>(null);
  const selectionOriginRef = useRef<HTMLElement | null>(null);
  const animationSequenceRef = useRef(0);
  const timeoutIdsRef = useRef<number[]>([]);

  const visibleItems = useMemo(
    () =>
      menuItems.filter((menuItem) => menuItem.category === selectedCategory),
    [selectedCategory],
  );

  const totalCount = getCartCount(cartItems);
  const totalPrice = getCartTotal(cartItems);

  const itemCountMap = useMemo(
    () =>
      cartItems.reduce((countMap, cartItem) => {
        const currentCount = countMap.get(cartItem.item.id) ?? 0;

        countMap.set(cartItem.item.id, currentCount + cartItem.quantity);

        return countMap;
      }, new Map<string, number>()),
    [cartItems],
  );

  useEffect(
    () => () => {
      timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    },
    [],
  );

  const prefersReducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scheduleTimeout = (callback: () => void, delay: number) => {
    const timeoutId = window.setTimeout(() => {
      timeoutIdsRef.current = timeoutIdsRef.current.filter(
        (savedTimeoutId) => savedTimeoutId !== timeoutId,
      );
      callback();
    }, delay);

    timeoutIdsRef.current.push(timeoutId);
  };

  const animateCartPanel = () => {
    if (prefersReducedMotion()) {
      return;
    }

    cartPanelRef.current?.animate(
      [
        {
          boxShadow: "0 24px 60px rgba(69, 32, 13, 0.13)",
          transform: "scale(1)",
        },
        {
          boxShadow: "0 32px 75px rgba(163, 65, 34, 0.24)",
          transform: "scale(1.02)",
        },
        {
          boxShadow: "0 24px 60px rgba(69, 32, 13, 0.13)",
          transform: "scale(1)",
        },
      ],
      {
        duration: 520,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    );
  };

  const animateMenuCard = (element: HTMLElement) => {
    if (prefersReducedMotion()) {
      return;
    }

    element.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(0.97)" },
        { transform: "scale(1)" },
      ],
      {
        duration: 260,
        easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    );
  };

  const startFlyToCartAnimation = (item: MenuItem, originElement: HTMLElement) => {
    if (prefersReducedMotion() || !cartPanelRef.current) {
      return;
    }

    const cartRect = cartPanelRef.current.getBoundingClientRect();
    const imageElement = originElement.querySelector("img");
    const originRect = (imageElement ?? originElement).getBoundingClientRect();
    const animationId = animationSequenceRef.current + 1;

    animationSequenceRef.current = animationId;

    const startX = originRect.left + originRect.width / 2 - 36;
    const startY = originRect.top + originRect.height / 2 - 36;
    const endX = cartRect.left + cartRect.width - 118;
    const endY = cartRect.top + 56;

    setFlyToCartAnimations((currentAnimations) => [
      ...currentAnimations,
      {
        id: animationId,
        image: item.image,
        startX,
        startY,
        deltaX: endX - startX,
        deltaY: endY - startY,
      },
    ]);

    scheduleTimeout(() => {
      setFlyToCartAnimations((currentAnimations) =>
        currentAnimations.filter((animation) => animation.id !== animationId),
      );
    }, cartFlyDurationMs);
  };

  const addToCart = (item: MenuItem, selectedSideDishes: BasicSideDish[] = []) => {
    setCartItems((currentCartItems) =>
      upsertCartItem(
        currentCartItems,
        {
          item,
          selectedSideDishes: normalizeSelectedSideDishes(selectedSideDishes),
        },
        1,
      ),
    );
  };

  const closeSideDishModal = () => {
    setPendingSetMenuItem(null);
    setSelectedBasicSideDishes([]);
    selectionOriginRef.current = null;
  };

  const commitSelectionToCart = (
    item: MenuItem,
    selectedSideDishes: BasicSideDish[],
    originElement?: HTMLElement | null,
  ) => {
    addToCart(item, selectedSideDishes);

    if (originElement) {
      animateMenuCard(originElement);
      startFlyToCartAnimation(item, originElement);
    }

    animateCartPanel();
  };

  const handleMenuCardSelect = (item: MenuItem, element: HTMLElement) => {
    if (isSetMenu(item)) {
      selectionOriginRef.current = element;
      setPendingSetMenuItem(item);
      setSelectedBasicSideDishes([]);
      return;
    }

    commitSelectionToCart(item, [], element);
  };

  const handleMenuCardKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    item: MenuItem,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleMenuCardSelect(item, event.currentTarget);
  };

  const incrementItem = (cartItem: CartItem) => {
    setCartItems((currentCartItems) =>
      upsertCartItem(currentCartItems, cartItem, 1),
    );
  };

  const decrementItem = (cartItem: CartItem) => {
    setCartItems((currentCartItems) =>
      upsertCartItem(currentCartItems, cartItem, -1),
    );
  };

  const toggleBasicSideDish = (sideDish: BasicSideDish) => {
    setSelectedBasicSideDishes((currentSideDishes) =>
      currentSideDishes.includes(sideDish)
        ? currentSideDishes.filter(
            (savedSideDish) => savedSideDish !== sideDish,
          )
        : normalizeSelectedSideDishes([...currentSideDishes, sideDish]),
    );
  };

  const confirmSetSelection = () => {
    if (!pendingSetMenuItem || !selectedBasicSideDishes.length) {
      return;
    }

    commitSelectionToCart(
      pendingSetMenuItem,
      selectedBasicSideDishes,
      selectionOriginRef.current,
    );
    closeSideDishModal();
  };

  const clearCart = () => {
    setCartItems([]);
    setIsCheckoutOpen(false);
  };

  const completeOrder = () => {
    if (!cartItems.length) {
      return;
    }

    const order = {
      orderNumber: nextOrderNumber(),
      placedAt: new Date(),
      paymentMethod,
      totalCount,
      totalPrice,
      estimatedWait: estimateWaitMinutes(totalCount),
    };

    setCompletedOrder(order);
    setCartItems([]);
    setIsCheckoutOpen(false);
    closeSideDishModal();
  };

  const startNewOrder = () => {
    setCompletedOrder(null);
    setPaymentMethod("카드 결제");
  };

  if (completedOrder) {
    return (
      <div className="app-shell completion-shell">
        <section className="completion-card">
          <p className="eyebrow">주문이 접수되었습니다</p>
          <h1>{completedOrder.orderNumber}</h1>
          <p className="completion-copy">
            결제가 완료되었습니다. 조리 시작 후 화면에 호출 번호가 표시됩니다.
          </p>

          <div className="completion-grid">
            <div>
              <span>결제 수단</span>
              <strong>{completedOrder.paymentMethod}</strong>
            </div>
            <div>
              <span>주문 수량</span>
              <strong>{completedOrder.totalCount}개</strong>
            </div>
            <div>
              <span>결제 금액</span>
              <strong>{formatPrice(completedOrder.totalPrice)}</strong>
            </div>
            <div>
              <span>예상 대기</span>
              <strong>{completedOrder.estimatedWait}분</strong>
            </div>
            <div>
              <span>주문 시각</span>
              <strong>{formatOrderTime(completedOrder.placedAt)}</strong>
            </div>
          </div>

          <button className="primary-action wide-button" onClick={startNewOrder}>
            새 주문 시작하기
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Self Order Kiosk</p>
          <h1>쩡이네 백반</h1>
          <p className="hero-copy">
            원하는 메뉴를 터치해서 담아보세요. 장바구니는 오른쪽에서 바로
            확인할 수 있습니다.
          </p>
        </div>

        <div className="hero-metrics">
          <article>
            <span>준비된 메뉴</span>
            <strong>{menuItems.length}개</strong>
          </article>
          <article>
            <span>현재 선택</span>
            <strong>{selectedCategory}</strong>
          </article>
          <article>
            <span>장바구니</span>
            <strong>{totalCount}개</strong>
          </article>
        </div>
      </header>

      <main className="content-grid">
        <section className="menu-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Menu</p>
              <h2>메뉴를 골라주세요</h2>
            </div>
            <div className="category-tabs" role="tablist" aria-label="메뉴 카테고리">
              {categories.map((category) => (
                <button
                  key={category}
                  className={
                    category === selectedCategory
                      ? "category-tab active"
                      : "category-tab"
                  }
                  onClick={() => setSelectedCategory(category)}
                  type="button"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="menu-grid">
            {visibleItems.map((item) => {
              const currentCount = itemCountMap.get(item.id) ?? 0;
              const imageClassName =
                item.category === "정식"
                  ? "menu-card-image"
                  : item.category === "음료"
                    ? "menu-card-image menu-card-image-contain menu-card-image-portrait"
                    : "menu-card-image menu-card-image-contain";

              return (
                <article
                  aria-label={
                    isSetMenu(item)
                      ? `${item.name} ${formatPrice(item.price)} 기본 찬 선택하기`
                      : `${item.name} ${formatPrice(item.price)} 장바구니에 담기`
                  }
                  className="menu-card"
                  key={item.id}
                  onClick={(event) => handleMenuCardSelect(item, event.currentTarget)}
                  onKeyDown={(event) => handleMenuCardKeyDown(event, item)}
                  role="button"
                  tabIndex={0}
                >
                  <div className={imageClassName}>
                    <img alt={`${item.name} 사진`} loading="lazy" src={item.image} />
                  </div>

                  <div className="menu-card-top">
                    <span className="menu-category">{item.category}</span>
                    {item.badge ? <span className="menu-badge">{item.badge}</span> : null}
                  </div>

                  <div className="menu-card-body">
                    <h3>{item.name}</h3>
                    <strong>{formatPrice(item.price)}</strong>
                  </div>

                  <div className="menu-card-actions">
                    <span className="menu-card-cta">
                      {isSetMenu(item) ? "기본 찬 고르기" : "터치로 담기"}
                    </span>
                    <span>{currentCount > 0 ? `${currentCount}개 담김` : "아직 담지 않음"}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="cart-panel" ref={cartPanelRef}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Cart</p>
              <h2>주문 내역</h2>
            </div>
            <button
              className="text-action"
              disabled={!cartItems.length}
              onClick={clearCart}
              type="button"
            >
              전체 비우기
            </button>
          </div>

          {cartItems.length ? (
            <div className="cart-list">
              {cartItems.map((cartItem) => (
                <article className="cart-item" key={getCartItemKey(cartItem)}>
                  <div className="cart-item-copy">
                    <h3>{cartItem.item.name}</h3>
                    {cartItem.selectedSideDishes.length ? (
                      <p className="cart-item-option-copy">
                        기본 찬: {cartItem.selectedSideDishes.join(", ")}
                      </p>
                    ) : null}
                    <p>{formatPrice(cartItem.item.price)}</p>
                  </div>

                  <div className="cart-item-controls">
                    <div className="stepper">
                      <button onClick={() => decrementItem(cartItem)} type="button">
                        -
                      </button>
                      <span>{cartItem.quantity}</span>
                      <button onClick={() => incrementItem(cartItem)} type="button">
                        +
                      </button>
                    </div>
                    <strong>
                      {formatPrice(
                        getLineTotal(cartItem.item.price, cartItem.quantity),
                      )}
                    </strong>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>장바구니가 비어 있습니다.</strong>
              <p>왼쪽 메뉴에서 원하는 음식을 선택해 주세요.</p>
            </div>
          )}

          <div className="cart-summary">
            <div>
              <span>총 수량</span>
              <strong>{totalCount}개</strong>
            </div>
            <div>
              <span>총 결제 금액</span>
              <strong>{formatPrice(totalPrice)}</strong>
            </div>
          </div>

          <button
            className="primary-action wide-button"
            disabled={!cartItems.length}
            onClick={() => setIsCheckoutOpen(true)}
            type="button"
          >
            주문하기
          </button>

        </aside>
      </main>

      {pendingSetMenuItem ? (
        <div className="modal-backdrop" role="presentation">
          <div
            className="checkout-modal side-dish-modal"
            aria-labelledby="side-dish-title"
            aria-modal="true"
            role="dialog"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">기본 찬 선택</p>
                <h2 id="side-dish-title">
                  {pendingSetMenuItem.name}에 담을 기본 찬을 골라주세요
                </h2>
              </div>
              <button
                aria-label="닫기"
                className="text-action"
                onClick={closeSideDishModal}
                type="button"
              >
                닫기
              </button>
            </div>

            <p className="panel-note">
              장바구니에 담기 전에 원하는 기본 찬을 모두 선택해 주세요.
            </p>

            <div className="side-dish-grid">
              {basicSideDishOptions.map((sideDish, index) => {
                const isSelected = selectedBasicSideDishes.includes(sideDish);

                return (
                  <button
                    key={sideDish}
                    aria-pressed={isSelected}
                    className={
                      isSelected ? "side-dish-option active" : "side-dish-option"
                    }
                    onClick={() => toggleBasicSideDish(sideDish)}
                    type="button"
                  >
                    <span className="side-dish-option-number">{index + 1}</span>
                    <span>{sideDish}</span>
                  </button>
                );
              })}
            </div>

            <div className="checkout-summary">
              <div>
                <span>선택한 기본 찬</span>
                <strong>
                  {selectedBasicSideDishes.length
                    ? `${selectedBasicSideDishes.length}개`
                    : "선택 필요"}
                </strong>
              </div>
            </div>

            <p className="panel-note selected-side-dishes-copy">
              {selectedBasicSideDishes.length
                ? `선택한 기본 찬: ${selectedBasicSideDishes.join(", ")}`
                : "기본 찬을 1개 이상 골라야 장바구니에 담을 수 있어요."}
            </p>

            <button
              className="primary-action wide-button"
              disabled={!selectedBasicSideDishes.length}
              onClick={confirmSetSelection}
              type="button"
            >
              장바구니에 담기
            </button>
          </div>
        </div>
      ) : null}

      <div aria-hidden="true" className="cart-fly-layer">
        {flyToCartAnimations.map((animation) => (
          <div
            className="cart-fly-item"
            key={animation.id}
            style={
              {
                "--fly-x": `${animation.deltaX}px`,
                "--fly-y": `${animation.deltaY}px`,
                left: `${animation.startX}px`,
                top: `${animation.startY}px`,
              } as CSSProperties
            }
          >
            <img alt="" src={animation.image} />
          </div>
        ))}
      </div>

      {isCheckoutOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div
            className="checkout-modal"
            aria-labelledby="checkout-title"
            aria-modal="true"
            role="dialog"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">Checkout</p>
                <h2 id="checkout-title">결제 방법을 선택해 주세요</h2>
              </div>
              <button
                aria-label="닫기"
                className="text-action"
                onClick={() => setIsCheckoutOpen(false)}
                type="button"
              >
                닫기
              </button>
            </div>

            <div className="payment-options">
              {(["카드 결제", "모바일 결제", "현금 결제"] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  className={
                    paymentMethod === method
                      ? "payment-option active"
                      : "payment-option"
                  }
                  onClick={() => setPaymentMethod(method)}
                  type="button"
                >
                  {method}
                </button>
              ))}
            </div>

            <div className="checkout-summary">
              <div>
                <span>결제 금액</span>
                <strong>{formatPrice(totalPrice)}</strong>
              </div>
              <div>
                <span>메뉴 수량</span>
                <strong>{totalCount}개</strong>
              </div>
              <div>
                <span>예상 대기</span>
                <strong>{estimateWaitMinutes(totalCount)}분</strong>
              </div>
            </div>

            <button className="primary-action wide-button" onClick={completeOrder}>
              {paymentMethod} 완료하기
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
