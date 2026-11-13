import sys
import os

# Add api directory to import path
sys.path.append("api")
from app import validate_order

test_cases = [
    # (Input Data, Expected Bool, Expected Value/Condition)
    ({"detail": "101-1203", "entry_method": "free"}, False, "Use English letters, Korean, numbers or spaces only."),
    ({"detail": "201号室", "entry_method": "free"}, False, "Use English letters, Korean, numbers or spaces only."),
    ({"detail": "ㄱㄴ", "entry_method": "free"}, False, "Use English letters, Korean, numbers or spaces only."),
    ({"detail": "Flat 2B", "entry_method": "free"}, True, "Flat 2B"),
    ({"detail": "Flat\n2B", "entry_method": "free"}, False, "Use English letters, Korean, numbers or spaces only."),
    ({"detail": "101동 1203호\n", "entry_method": "free"}, True, "101동 1203호"), # trailing newline stripped cleanly
    ({"detail": "Flat 2B"}, False, "Choose how the rider gets in."),
    ({"detail": "Flat 2B", "entry_method": "phone"}, False, "Choose how the rider gets in."),
    ({"detail": "Flat 2B", "entry_method": "door_code"}, False, "Enter the door code."),
    ({"detail": "Flat 2B", "entry_method": "door_code", "entry_code": "12ab"}, False, "Use numbers, # or * only."),
    
    # Test 11: call with code, check explicitly that entry_code is dropped (== "")
    ({"detail": "Flat 2B", "entry_method": "call", "entry_code": "99"}, True, "CHECK_EMPTY_CODE"),
    
    ({"detail": "Flat 2B", "entry_method": "free", "rider_note": "a" * 201}, False, "Use up to 200 characters."),
    ({}, False, "Enter your building and unit."),
    (None, False, "Invalid request."),
    ({"detail": "Flat 2B", "entry_method": "free", "rider_note": 5}, False, "Use up to 200 characters."),
    
    # Optional boundary tests:
    ({"detail": "A" * 50, "entry_method": "free"}, True, "A" * 50), # Exactly 50 characters detail passes
    ({"detail": "Flat 2B", "entry_method": "door_code", "entry_code": "1" * 20}, True, "1" * 20), # Exactly 20 characters code passes
    ({"detail": "Flat 2B", "entry_method": "free", "rider_note": "a" * 200}, True, "a" * 200), # Exactly 200 characters note passes
]

def run_tests():
    passed = 0
    failed = 0
    for i, (inp, exp_ok, exp_val) in enumerate(test_cases, 1):
        try:
            ok, res = validate_order(inp)
            if ok == exp_ok:
                if ok:
                    # Special explicit check for Test 11 to ensure entry_code is dropped
                    if exp_val == "CHECK_EMPTY_CODE":
                        matched = (res.get("entry_code") == "")
                    else:
                        matched = exp_val in str(res.values())
                else:
                    matched = (res == exp_val)
                
                if matched:
                    print(f"Test {i:2d}: PASS")
                    passed += 1
                else:
                    print(f"Test {i:2d}: FAIL | Input: {inp} | Expected match '{exp_val}', got: {res}")
                    failed += 1
            else:
                print(f"Test {i:2d}: FAIL | Input: {inp} | Expected status {exp_ok}, got {ok} with {res}")
                failed += 1
        except Exception as e:
            print(f"Test {i:2d}: FAIL | Input: {inp} | Crashed with exception: {e}")
            failed += 1

    print(f"\nResult: {passed} passed, {failed} passed.")

if __name__ == "__main__":
    run_tests()
