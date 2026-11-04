import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RestaurantOrders } from './restaurant-orders';

describe('RestaurantOrders', () => {
  let component: RestaurantOrders;
  let fixture: ComponentFixture<RestaurantOrders>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantOrders],
    }).compileComponents();

    fixture = TestBed.createComponent(RestaurantOrders);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
