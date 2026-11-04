

import os
import re
from datetime import datetime, timedelta, timezone

import jwt
import pymysql
import logging
from argon2 import PasswordHasher
from argon2.exceptions import (
    VerifyMismatchError,
    VerificationError,
    InvalidHashError,
)
from dotenv import load_dotenv
from fastapi import (
    FastAPI,
    HTTPException,
    Depends,
    File,
    Form,
    UploadFile,
)
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from pathlib import Path
from uuid import uuid4
load_dotenv()

password_hasher = PasswordHasher()
bearer_scheme = HTTPBearer()
class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=150)
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(
        default="CLIENTE",
        pattern="^(CLIENTE|RESTAURANTE)$",
    )
    restaurant_name: str | None = Field(
        default=None,
        min_length=2,
        max_length=150,
    )
class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=150)
    password: str = Field(min_length=1, max_length=128)


class OrderItemRequest(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0, le=99)


class CreateOrderRequest(BaseModel):
    items: list[OrderItemRequest] = Field(min_length=1, max_length=50)
    address: str = Field(min_length=5, max_length=255)
    phone: str = Field(min_length=7, max_length=30)
    payment_method: str

class UpdateOrderStatusRequest(BaseModel):
    status: str = Field(min_length=1, max_length=20)

app = FastAPI(
    title="AdminFood API",
    description="API para la plataforma de pedidos de comida",
    version="1.0.0",
)

# Directorios para almacenar imágenes.
UPLOAD_ROOT = Path(__file__).resolve().parent / "uploads"

PRODUCT_UPLOAD_DIR = UPLOAD_ROOT / "products"
RESTAURANT_UPLOAD_DIR = UPLOAD_ROOT / "restaurants"

UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
PRODUCT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
RESTAURANT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
# Servir imágenes mediante URLs públicas.
app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_ROOT)),
    name="uploads",
)

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:4200"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_connection():
    return pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        database=os.getenv("DB_NAME", "adminfood"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=10,
        ssl={
            "ca": os.getenv(
                "DB_SSL_CA",
                "/etc/ssl/certs/ca-certificates.crt"
            ),
            "check_hostname": True,
        },
    )
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    jwt_secret = os.getenv("JWT_SECRET")

    if not jwt_secret:
        raise HTTPException(
            status_code=500,
            detail="La autenticación no está configurada",
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            jwt_secret,
            algorithms=["HS256"],
        )

        user_id = int(payload["sub"])

    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        connection = get_connection()

        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT id, name, email, role
                    FROM users
                    WHERE id = %s
                    LIMIT 1
                """, (user_id,))

                user = cursor.fetchone()
        finally:
            connection.close()

    except pymysql.MySQLError as error:
        raise HTTPException(
            status_code=503,
            detail="No se pudo acceder a la base de datos",
        ) from error

    if not user:
        raise HTTPException(
            status_code=401,
            detail="El usuario de la sesión ya no existe",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


@app.get("/")
def home():
    return {"message": "AdminFood API funcionando correctamente"}


@app.get("/api/health/database")
def database_health():
    try:
        connection = get_connection()

        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT DATABASE() AS database_name")
                result = cursor.fetchone()

            return {
                "connected": True,
                "database": result["database_name"],
            }

        finally:
            connection.close()

    except (pymysql.MySQLError, KeyError, ValueError):
        logging.exception("ERROR EN /api/health/database")

        raise HTTPException(
            status_code=503,
            detail="No se pudo conectar con la base de datos",
        )
@app.get("/api/restaurants")
def get_restaurants():
    try:
        connection = get_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        id,
                        name,
                        description,
                        category,
                        address,
                        phone,
                        image_url
                    FROM restaurants
                    WHERE active = TRUE
                    ORDER BY name
                """)
                return cursor.fetchall()
        finally:
            connection.close()
    except pymysql.MySQLError as error:
          logging.exception("ERROR EN /api/restaurants")
          raise HTTPException(
            status_code=503,
            detail="No se pudo consultar el restaurante",
        ) from error


@app.get("/api/restaurants/{restaurant_id}/products")
def get_restaurant_products(restaurant_id: int):
    try:
        connection = get_connection()
        try:
            with connection.cursor() as cursor:
                # Verificar que el restaurante exista y esté activo.
                cursor.execute("""
                    SELECT id
                    FROM restaurants
                    WHERE id = %s AND active = TRUE
                """, (restaurant_id,))

                restaurant = cursor.fetchone()

                if restaurant is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Restaurante no encontrado",
                    )

                # Consultar los productos activos del restaurante.
                cursor.execute("""
                    SELECT
                        id,
                        restaurant_id,
                        name,
                        description,
                        price,
                        category,
                        image_url
                    FROM products
                    WHERE restaurant_id = %s
                      AND active = TRUE
                    ORDER BY name
                """, (restaurant_id,))

                return cursor.fetchall()
        finally:
            connection.close()

    except pymysql.MySQLError as error:
        raise HTTPException(
            status_code=503,
            detail="No se pudieron consultar los productos",
        ) from error

@app.get("/api/products/{product_id}")
def get_product(product_id: int):
    try:
        connection = get_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        id,
                        restaurant_id,
                        name,
                        description,
                        price,
                        category,
                        image_url
                    FROM products
                    WHERE id = %s
                      AND active = TRUE
                """, (product_id,))

                product = cursor.fetchone()

                if product is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Producto no encontrado",
                    )

                return product
        finally:
            connection.close()

    except pymysql.MySQLError as error:
        raise HTTPException(
            status_code=503,
            detail="No se pudo consultar el producto",
        ) from error

@app.post("/api/auth/register", status_code=201)
def register_user(data: RegisterRequest):
    name = data.name.strip()
    email = data.email.strip().lower()
    role = data.role
    restaurant_name = (
        data.restaurant_name.strip()
        if data.restaurant_name
        else ""
    )

    if len(name) < 2:
        raise HTTPException(
            status_code=422,
            detail="El nombre debe tener al menos 2 caracteres",
        )

    if not re.fullmatch(
        r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
        email,
    ):
        raise HTTPException(
            status_code=422,
            detail="El correo electrónico no es válido",
        )

    if role == "RESTAURANTE" and len(restaurant_name) < 2:
        raise HTTPException(
            status_code=422,
            detail="El nombre del restaurante es obligatorio",
        )

    password_hash = password_hasher.hash(data.password)

    try:
        connection = get_connection()

        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO users (name, email, password_hash, role)
                    VALUES (%s, %s, %s, %s)
                """, (name, email, password_hash, role))

                user_id = cursor.lastrowid

                if role == "RESTAURANTE":
                    cursor.execute("""
                        INSERT INTO restaurants (owner_id, name, active)
                        VALUES (%s, %s, TRUE)
                    """, (user_id, restaurant_name))

            connection.commit()

            return {
                "message": "Usuario registrado correctamente",
                "user": {
                    "id": user_id,
                    "name": name,
                    "email": email,
                    "role": role,
                },
            }

        except Exception:
            connection.rollback()
            raise

        finally:
            connection.close()

    except pymysql.err.IntegrityError as error:
        if error.args and error.args[0] == 1062:
            raise HTTPException(
                status_code=409,
                detail="Ese correo electrónico ya está registrado",
            ) from error

        raise HTTPException(
            status_code=500,
            detail="No se pudo registrar el usuario",
        ) from error

    except pymysql.MySQLError as error:
        raise HTTPException(
            status_code=503,
            detail="No se pudo acceder a la base de datos",
        ) from error

@app.post("/api/auth/login")
def login_user(data: LoginRequest):
    email = data.email.strip().lower()

    jwt_secret = os.getenv("JWT_SECRET")

    if not jwt_secret:
        raise HTTPException(
            status_code=500,
            detail="La autenticación no está configurada",
        )

    try:
        connection = get_connection()

        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT id, name, email, password_hash, role
                    FROM users
                    WHERE email = %s
                    LIMIT 1
                """, (email,))

                user = cursor.fetchone()
        finally:
            connection.close()

    except pymysql.MySQLError as error:
        raise HTTPException(
            status_code=503,
            detail="No se pudo acceder a la base de datos",
        ) from error

    # Mismo mensaje para correo inexistente y contraseña incorrecta.
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Correo o contraseña incorrectos",
        )

    try:
        password_hasher.verify(
            user["password_hash"],
            data.password,
        )
    except (
        VerifyMismatchError,
        VerificationError,
        InvalidHashError,
    ):
        raise HTTPException(
            status_code=401,
            detail="Correo o contraseña incorrectos",
        )

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=60)

    token = jwt.encode(
        {
            "sub": str(user["id"]),
            "role": user["role"],
            "exp": expires_at,
        },
        jwt_secret,
        algorithm="HS256",
    )

    return {
        "message": "Inicio de sesión correcto",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
        },
    }


@app.get("/api/auth/me")
def get_my_profile(
    current_user: dict = Depends(get_current_user),
):
    return {
        "user": current_user,
    }


@app.post("/api/orders", status_code=201)
def create_order(
    data: CreateOrderRequest,
    current_user: dict = Depends(get_current_user),
):
    address = data.address.strip()
    phone = data.phone.strip()
    payment_method = data.payment_method.strip().upper()

    if len(address) < 5 or not phone:
        raise HTTPException(
            status_code=422,
            detail="La dirección y el teléfono son obligatorios",
        )

    if payment_method not in ("EFECTIVO", "TARJETA"):
        raise HTTPException(
            status_code=422,
            detail="Método de pago no válido",
        )

    product_ids = [item.product_id for item in data.items]

    if len(product_ids) != len(set(product_ids)):
        raise HTTPException(
            status_code=422,
            detail="No repitas productos en el pedido",
        )

    connection = None

    try:
        connection = get_connection()
        connection.begin()

        with connection.cursor() as cursor:
            placeholders = ", ".join(["%s"] * len(product_ids))

            cursor.execute(
                f"""
                SELECT
                    p.id,
                    p.restaurant_id,
                    p.name,
                    p.price
                FROM products AS p
                JOIN restaurants AS r
                    ON r.id = p.restaurant_id
                WHERE p.id IN ({placeholders})
                  AND p.active = TRUE
                  AND r.active = TRUE
                FOR UPDATE
                """,
                tuple(product_ids),
            )

            products = cursor.fetchall()
            products_by_id = {p["id"]: p for p in products}

            if len(products_by_id) != len(product_ids):
                raise HTTPException(
                    status_code=422,
                    detail="Uno o más productos no existen o no están disponibles",
                )

            restaurant_ids = {
                products_by_id[item.product_id]["restaurant_id"]
                for item in data.items
            }

            if len(restaurant_ids) != 1:
                raise HTTPException(
                    status_code=422,
                    detail="Todos los productos deben pertenecer al mismo restaurante",
                )

            restaurant_id = next(iter(restaurant_ids))
            total = sum(
                (
                    products_by_id[item.product_id]["price"] * item.quantity
                    for item in data.items
                ),
                start=0,
            )

            cursor.execute(
                """
                INSERT INTO orders (
                    customer_id,
                    restaurant_id,
                    address,
                    phone,
                    payment_method,
                    total,
                    status
                )
                VALUES (%s, %s, %s, %s, %s, %s, 'RECIBIDO')
                """,
                (
                    current_user["id"],
                    restaurant_id,
                    address,
                    phone,
                    payment_method,
                    total,
                ),
            )

            order_id = cursor.lastrowid
            response_items = []

            for item in data.items:
                product = products_by_id[item.product_id]
                unit_price = product["price"]

                cursor.execute(
                    """
                    INSERT INTO order_items (
                        order_id,
                        product_id,
                        product_name,
                        quantity,
                        unit_price
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        order_id,
                        item.product_id,
                        product["name"],
                        item.quantity,
                        unit_price,
                    ),
                )

                response_items.append({
                    "product_id": item.product_id,
                    "product_name": product["name"],
                    "quantity": item.quantity,
                    "unit_price": float(unit_price),
                    "subtotal": float(unit_price * item.quantity),
                })

        connection.commit()

        return {
            "id": order_id,
            "customer_id": current_user["id"],
            "restaurant_id": restaurant_id,
            "address": address,
            "phone": phone,
            "payment_method": payment_method,
            "total": float(total),
            "status": "RECIBIDO",
            "items": response_items,
        }

    except HTTPException:
        if connection is not None:
            connection.rollback()
        raise

    except pymysql.MySQLError as error:
        if connection is not None:
            connection.rollback()

        raise HTTPException(
            status_code=503,
            detail="No se pudo guardar el pedido",
        ) from error

    finally:
        if connection is not None:
            connection.close()


def serialize_order(cursor, order):
    cursor.execute("""
        SELECT
            oi.product_id,
            oi.product_name,
            oi.quantity,
            oi.unit_price,
            p.image_url
        FROM order_items AS oi
        LEFT JOIN products AS p
            ON p.id = oi.product_id
        WHERE oi.order_id = %s
        ORDER BY oi.id
    """, (order["id"],))

    items = cursor.fetchall()

    return {
        "id": order["id"],
        "customer_id": order["customer_id"],
        "restaurant_id": order["restaurant_id"],
        "address": order["address"],
        "phone": order["phone"],
        "payment_method": order["payment_method"],
        "total": float(order["total"]),
        "status": order["status"],
        "created_at": order["created_at"],
        "items": [
            {
                "product_id": item["product_id"],
                "product_name": item["product_name"],
                "quantity": item["quantity"],
                "unit_price": float(item["unit_price"]),
                "subtotal": float(
                    item["unit_price"] * item["quantity"]
                ),
                "image_url": item["image_url"],
            }
            for item in items
        ],
    }

def get_order_for_user(cursor, order_id, user):
    if user["role"] == "ADMIN":
        cursor.execute("""
            SELECT *
            FROM orders
            WHERE id = %s
        """, (order_id,))

    elif user["role"] == "RESTAURANTE":
        cursor.execute("""
            SELECT o.*
            FROM orders AS o
            JOIN restaurants AS r
                ON r.id = o.restaurant_id
            WHERE o.id = %s
              AND r.owner_id = %s
        """, (order_id, user["id"]))

    elif user["role"] == "CLIENTE":
        cursor.execute("""
            SELECT *
            FROM orders
            WHERE id = %s
              AND customer_id = %s
        """, (order_id, user["id"]))

    else:
        raise HTTPException(
            status_code=403,
            detail="No tienes permiso para consultar pedidos",
        )

    return cursor.fetchone()


@app.get("/api/orders")
def get_orders(current_user: dict = Depends(get_current_user)):
    try:
        connection = get_connection()

        try:
            with connection.cursor() as cursor:
                if current_user["role"] == "ADMIN":
                    cursor.execute("""
                        SELECT *
                        FROM orders
                        ORDER BY created_at DESC, id DESC
                    """)

                elif current_user["role"] == "RESTAURANTE":
                    cursor.execute("""
                        SELECT o.*
                        FROM orders AS o
                        JOIN restaurants AS r
                            ON r.id = o.restaurant_id
                        WHERE r.owner_id = %s
                        ORDER BY o.created_at DESC, o.id DESC
                    """, (current_user["id"],))

                elif current_user["role"] == "CLIENTE":
                    cursor.execute("""
                        SELECT *
                        FROM orders
                        WHERE customer_id = %s
                        ORDER BY created_at DESC, id DESC
                    """, (current_user["id"],))

                else:
                    raise HTTPException(
                        status_code=403,
                        detail="No tienes permiso para consultar pedidos",
                    )

                orders = cursor.fetchall()

                return [
                    serialize_order(cursor, order)
                    for order in orders
                ]

        finally:
            connection.close()

    except HTTPException:
        raise
    except pymysql.MySQLError as error:
        raise HTTPException(
            status_code=503,
            detail="No se pudieron consultar los pedidos",
        ) from error


@app.get("/api/orders/{order_id}")
def get_order(
    order_id: int,
    current_user: dict = Depends(get_current_user),
):
    try:
        connection = get_connection()

        try:
            with connection.cursor() as cursor:
                order = get_order_for_user(
                    cursor, order_id, current_user
                )

                if not order:
                    raise HTTPException(
                        status_code=404,
                        detail="Pedido no encontrado",
                    )

                return serialize_order(cursor, order)

        finally:
            connection.close()

    except HTTPException:
        raise
    except pymysql.MySQLError as error:
        raise HTTPException(
            status_code=503,
            detail="No se pudo consultar el pedido",
        ) from error


@app.patch("/api/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    data: UpdateOrderStatusRequest,
    current_user: dict = Depends(get_current_user),
):
    allowed_statuses = [
        "RECIBIDO",
        "PREPARANDO",
        "EN CAMINO",
        "ENTREGADO",
    ]

    if current_user["role"] not in ("RESTAURANTE", "ADMIN"):
        raise HTTPException(
            status_code=403,
            detail="No tienes permiso para actualizar pedidos",
        )

    if data.status not in allowed_statuses:
        raise HTTPException(
            status_code=422,
            detail="Estado no válido",
        )

    connection = None

    try:
        connection = get_connection()
        connection.begin()

        with connection.cursor() as cursor:
            if current_user["role"] == "ADMIN":
                cursor.execute("""
                    SELECT id, status
                    FROM orders
                    WHERE id = %s
                    FOR UPDATE
                """, (order_id,))
            else:
                cursor.execute("""
                    SELECT o.id, o.status
                    FROM orders AS o
                    JOIN restaurants AS r
                        ON r.id = o.restaurant_id
                    WHERE o.id = %s
                      AND r.owner_id = %s
                    FOR UPDATE
                """, (order_id, current_user["id"]))

            order = cursor.fetchone()

            if not order:
                raise HTTPException(
                    status_code=404,
                    detail="Pedido no encontrado",
                )

            current_index = allowed_statuses.index(order["status"])
            requested_index = allowed_statuses.index(data.status)

            if requested_index != current_index + 1:
                raise HTTPException(
                    status_code=422,
                    detail="El pedido solo puede avanzar al siguiente estado",
                )

            cursor.execute("""
                UPDATE orders
                SET status = %s
                WHERE id = %s
            """, (data.status, order_id))

        connection.commit()

        return {
            "message": "Estado del pedido actualizado",
            "id": order_id,
            "status": data.status,
        }

    except HTTPException:
        if connection is not None:
            connection.rollback()
        raise
    except pymysql.MySQLError as error:
        if connection is not None:
            connection.rollback()
        raise HTTPException(
            status_code=503,
            detail="No se pudo actualizar el pedido",
        ) from error
    finally:
        if connection is not None:
            connection.close()


def get_owned_restaurant_id(cursor, current_user):
    """Obtiene el restaurante activo del usuario autenticado."""

    if current_user["role"] != "RESTAURANTE":
        raise HTTPException(
            status_code=403,
            detail="Solo los restaurantes pueden gestionar productos",
        )

    cursor.execute("""
        SELECT id
        FROM restaurants
        WHERE owner_id = %s
          AND active = TRUE
        LIMIT 1
    """, (current_user["id"],))

    restaurant = cursor.fetchone()

    if not restaurant:
        raise HTTPException(
            status_code=404,
            detail="No tienes un restaurante activo asociado",
        )

    return restaurant["id"]

@app.get("/api/restaurant/profile")
def get_my_restaurant_profile(
    current_user: dict = Depends(get_current_user),
):
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            restaurant_id = get_owned_restaurant_id(
                cursor, current_user
            )

            cursor.execute("""
                SELECT
                    id,
                    name,
                    description,
                    category,
                    address,
                    phone,
                    image_url
                FROM restaurants
                WHERE id = %s
                LIMIT 1
            """, (restaurant_id,))

            restaurant = cursor.fetchone()

            if not restaurant:
                raise HTTPException(
                    status_code=404,
                    detail="Tienda no encontrada",
                )

            return restaurant

    except HTTPException:
        raise

    except pymysql.MySQLError as error:
        raise HTTPException(
            status_code=503,
            detail="No se pudo consultar el perfil de la tienda",
        ) from error

    finally:
        if connection is not None:
            connection.close()

async def save_restaurant_image(image: UploadFile | None):
    """Guarda una imagen validada de una tienda."""

    if image is None:
        return None

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
    }

    if image.content_type not in allowed_types:
        raise HTTPException(
            status_code=422,
            detail="Formato no permitido. Usa JPG, PNG, WEBP o GIF",
        )

    temporary_path = (
        RESTAURANT_UPLOAD_DIR / f"{uuid4().hex}.tmp"
    )

    total_size = 0
    header = b""

    try:
        with temporary_path.open("wb") as destination:
            while True:
                chunk = await image.read(64 * 1024)

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > 5 * 1024 * 1024:
                    raise HTTPException(
                        status_code=413,
                        detail="La imagen no puede superar los 5 MB",
                    )

                if len(header) < 12:
                    header += chunk[:12 - len(header)]

                destination.write(chunk)

        if total_size == 0:
            raise HTTPException(
                status_code=422,
                detail="El archivo de imagen está vacío",
            )

        if header.startswith(b"\x89PNG\r\n\x1a\n"):
            extension = ".png"

        elif header.startswith(b"\xff\xd8\xff"):
            extension = ".jpg"

        elif header.startswith((b"GIF87a", b"GIF89a")):
            extension = ".gif"

        elif (
            header.startswith(b"RIFF")
            and header[8:12] == b"WEBP"
        ):
            extension = ".webp"

        else:
            raise HTTPException(
                status_code=422,
                detail="El contenido no es una imagen válida",
            )

        final_name = f"{uuid4().hex}{extension}"
        final_path = RESTAURANT_UPLOAD_DIR / final_name

        temporary_path.rename(final_path)

        return f"/uploads/restaurants/{final_name}"

    except Exception:
        temporary_path.unlink(missing_ok=True)
        raise

    finally:
        await image.close()
@app.put("/api/restaurant/profile")
async def update_my_restaurant_profile(
    name: str = Form(..., min_length=2, max_length=150),
    description: str = Form("", max_length=5000),
    category: str = Form("", max_length=80),
    address: str = Form("", max_length=255),
    phone: str = Form("", max_length=30),
    image: UploadFile | None = File(None),
    current_user: dict = Depends(get_current_user),
):
    connection = None
    new_image_url = None
    old_image_url = None
    committed = False

    try:
        name = name.strip()

        if len(name) < 2:
            raise HTTPException(
                status_code=422,
                detail="El nombre de la tienda debe tener al menos 2 caracteres",
            )

        new_image_url = await save_restaurant_image(image)

        connection = get_connection()

        with connection.cursor() as cursor:
            restaurant_id = get_owned_restaurant_id(
                cursor, current_user
            )

            cursor.execute("""
                SELECT image_url
                FROM restaurants
                WHERE id = %s
                LIMIT 1
            """, (restaurant_id,))

            restaurant = cursor.fetchone()

            if not restaurant:
                raise HTTPException(
                    status_code=404,
                    detail="Tienda no encontrada",
                )

            old_image_url = restaurant["image_url"]

            final_image_url = (
                new_image_url
                if new_image_url is not None
                else old_image_url
            )

            cursor.execute("""
                UPDATE restaurants
                SET
                    name = %s,
                    description = %s,
                    category = %s,
                    address = %s,
                    phone = %s,
                    image_url = %s
                WHERE id = %s
            """, (
                name,
                description.strip(),
                category.strip(),
                address.strip(),
                phone.strip(),
                final_image_url,
                restaurant_id,
            ))

            cursor.execute("""
                SELECT
                    id,
                    name,
                    description,
                    category,
                    address,
                    phone,
                    image_url
                FROM restaurants
                WHERE id = %s
                LIMIT 1
            """, (restaurant_id,))

            updated_restaurant = cursor.fetchone()

        connection.commit()
        committed = True

        # Eliminar la fotografía anterior después de guardar
        # correctamente la nueva ruta en MariaDB.
        if new_image_url and old_image_url:
            old_image_path = (
                RESTAURANT_UPLOAD_DIR /
                Path(old_image_url).name
            )

            try:
                old_image_path.unlink(missing_ok=True)
            except OSError:
                pass

        return updated_restaurant

    except HTTPException:
        if connection is not None:
            connection.rollback()
        raise

    except pymysql.MySQLError as error:
        if connection is not None:
            connection.rollback()

        raise HTTPException(
            status_code=503,
            detail="No se pudo actualizar el perfil de la tienda",
        ) from error

    finally:
        if connection is not None:
            connection.close()

        # Si la actualización falló, no conservar la imagen nueva.
        if new_image_url and not committed:
            new_image_path = (
                RESTAURANT_UPLOAD_DIR /
                Path(new_image_url).name
            )
            new_image_path.unlink(missing_ok=True)
async def save_product_image(image: UploadFile | None):
    """Guarda una imagen validada y devuelve su URL relativa."""

    if image is None:
        return None

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
    }

    if image.content_type not in allowed_types:
        raise HTTPException(
            status_code=422,
            detail="Formato no permitido. Usa JPG, PNG, WEBP o GIF",
        )

    temporary_path = PRODUCT_UPLOAD_DIR / f"{uuid4().hex}.tmp"
    total_size = 0
    header = b""

    try:
        with temporary_path.open("wb") as destination:
            while True:
                chunk = await image.read(64 * 1024)

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > 5 * 1024 * 1024:
                    raise HTTPException(
                        status_code=413,
                        detail="La imagen no puede superar los 5 MB",
                    )

                if len(header) < 12:
                    header += chunk[:12 - len(header)]

                destination.write(chunk)

        if total_size == 0:
            raise HTTPException(
                status_code=422,
                detail="El archivo de imagen está vacío",
            )

        if header.startswith(b"\x89PNG\r\n\x1a\n"):
            extension = ".png"
        elif header.startswith(b"\xff\xd8\xff"):
            extension = ".jpg"
        elif header.startswith((b"GIF87a", b"GIF89a")):
            extension = ".gif"
        elif (
            header.startswith(b"RIFF")
            and header[8:12] == b"WEBP"
        ):
            extension = ".webp"
        else:
            raise HTTPException(
                status_code=422,
                detail="El contenido del archivo no es una imagen válida",
            )

        final_name = f"{uuid4().hex}{extension}"
        final_path = PRODUCT_UPLOAD_DIR / final_name
        temporary_path.rename(final_path)

        return f"/uploads/products/{final_name}"

    except Exception:
        temporary_path.unlink(missing_ok=True)
        raise

    finally:
        await image.close()


@app.get("/api/restaurant/products")
def get_my_restaurant_products(
    current_user: dict = Depends(get_current_user),
):
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            restaurant_id = get_owned_restaurant_id(
                cursor, current_user
            )

            cursor.execute("""
                SELECT
                    id,
                    restaurant_id,
                    name,
                    description,
                    price,
                    category,
                    image_url
                FROM products
                WHERE restaurant_id = %s
                  AND active = TRUE
                ORDER BY name
            """, (restaurant_id,))

            return cursor.fetchall()

    except HTTPException:
        raise

    except pymysql.MySQLError as error:
        raise HTTPException(
            status_code=503,
            detail="No se pudieron consultar tus productos",
        ) from error

    finally:
        if connection is not None:
            connection.close()


@app.post("/api/restaurant/products", status_code=201)
async def create_my_restaurant_product(
    name: str = Form(min_length=2, max_length=150),
    price: float = Form(gt=0),
    category: str = Form(min_length=1, max_length=80),
    description: str = Form(default=""),
    image: UploadFile | None = File(default=None),
    current_user: dict = Depends(get_current_user),
):
    name = name.strip()
    category = category.strip()
    description = description.strip()

    if len(name) < 2 or not category:
        raise HTTPException(
            status_code=422,
            detail="El nombre y la categoría son obligatorios",
        )

    image_url = await save_product_image(image)
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            restaurant_id = get_owned_restaurant_id(
                cursor, current_user
            )

            cursor.execute("""
                INSERT INTO products (
                    restaurant_id,
                    name,
                    description,
                    price,
                    category,
                    image_url,
                    active
                )
                VALUES (%s, %s, %s, %s, %s, %s, TRUE)
            """, (
                restaurant_id,
                name,
                description,
                price,
                category,
                image_url,
            ))

            product_id = cursor.lastrowid

        connection.commit()

        return {
            "message": "Producto creado correctamente",
            "id": product_id,
            "restaurant_id": restaurant_id,
            "name": name,
            "description": description,
            "price": price,
            "category": category,
            "image_url": image_url,
        }

    except HTTPException:
        if connection is not None:
            connection.rollback()
        if image_url:
            (PRODUCT_UPLOAD_DIR / Path(image_url).name).unlink(
                missing_ok=True
            )
        raise

    except pymysql.MySQLError as error:
        if connection is not None:
            connection.rollback()
        if image_url:
            (PRODUCT_UPLOAD_DIR / Path(image_url).name).unlink(
                missing_ok=True
            )
        raise HTTPException(
            status_code=503,
            detail="No se pudo crear el producto",
        ) from error

    finally:
        if connection is not None:
            connection.close()


@app.put("/api/restaurant/products/{product_id}")
async def update_my_restaurant_product(
    product_id: int,
    name: str = Form(min_length=2, max_length=150),
    price: float = Form(gt=0),
    category: str = Form(min_length=1, max_length=80),
    description: str = Form(default=""),
    image: UploadFile | None = File(default=None),
    current_user: dict = Depends(get_current_user),
):
    name = name.strip()
    category = category.strip()
    description = description.strip()

    if len(name) < 2 or not category:
        raise HTTPException(
            status_code=422,
            detail="El nombre y la categoría son obligatorios",
        )

    connection = None
    image_url = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            restaurant_id = get_owned_restaurant_id(
                cursor, current_user
            )

            cursor.execute("""
                SELECT id, image_url
                FROM products
                WHERE id = %s
                  AND restaurant_id = %s
                  AND active = TRUE
                LIMIT 1
            """, (product_id, restaurant_id))

            product = cursor.fetchone()

            if not product:
                raise HTTPException(
                    status_code=404,
                    detail="Producto no encontrado",
                )

            old_image_url = product["image_url"]

            if image is not None:
                image_url = await save_product_image(image)
            else:
                image_url = old_image_url

            cursor.execute("""
                UPDATE products
                SET name = %s,
                    description = %s,
                    price = %s,
                    category = %s,
                    image_url = %s
                WHERE id = %s
                  AND restaurant_id = %s
                  AND active = TRUE
            """, (
                name,
                description,
                price,
                category,
                image_url,
                product_id,
                restaurant_id,
            ))

        connection.commit()

        # Eliminar imagen anterior únicamente después del commit.
        if image is not None and old_image_url:
            old_path = PRODUCT_UPLOAD_DIR / Path(old_image_url).name
            old_path.unlink(missing_ok=True)

        return {
            "message": "Producto actualizado correctamente",
            "id": product_id,
            "name": name,
            "description": description,
            "price": price,
            "category": category,
            "image_url": image_url,
        }

    except HTTPException:
        if connection is not None:
            connection.rollback()
        if image_url and image_url != (
            product.get("image_url") if "product" in locals() and product else None
        ):
            (PRODUCT_UPLOAD_DIR / Path(image_url).name).unlink(
                missing_ok=True
            )
        raise

    except pymysql.MySQLError as error:
        if connection is not None:
            connection.rollback()
        if image_url and image_url != (
            product.get("image_url") if "product" in locals() and product else None
        ):
            (PRODUCT_UPLOAD_DIR / Path(image_url).name).unlink(
                missing_ok=True
            )
        raise HTTPException(
            status_code=503,
            detail="No se pudo actualizar el producto",
        ) from error

    finally:
        if connection is not None:
            connection.close()


@app.delete("/api/restaurant/products/{product_id}")
def deactivate_my_restaurant_product(
    product_id: int,
    current_user: dict = Depends(get_current_user),
):
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            restaurant_id = get_owned_restaurant_id(
                cursor, current_user
            )

            cursor.execute("""
                UPDATE products
                SET active = FALSE
                WHERE id = %s
                  AND restaurant_id = %s
                  AND active = TRUE
            """, (product_id, restaurant_id))

            if cursor.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Producto no encontrado",
                )

        connection.commit()

        return {
            "message": "Producto desactivado correctamente",
            "id": product_id,
        }

    except HTTPException:
        if connection is not None:
            connection.rollback()
        raise

    except pymysql.MySQLError as error:
        if connection is not None:
            connection.rollback()
        raise HTTPException(
            status_code=503,
            detail="No se pudo desactivar el producto",
        ) from error

    finally:
        if connection is not None:
            connection.close()
