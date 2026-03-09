import pytest

# Prisma Client Python uses asyncio internals; restrict all tests to asyncio backend only.
@pytest.fixture(params=["asyncio"])
def anyio_backend():
    return "asyncio"
