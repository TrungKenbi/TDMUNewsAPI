module.exports.dayOfWeekViToNum = function dayOfWeekViToNum (dayOfWeekVi) {
    switch (dayOfWeekVi) {

        case 'Thứ Hai':
            return 1;

        case 'Thứ Ba':
            return 2;

        case 'Thứ Tư':
            return 3;

        case 'Thứ Năm':
            return 4;

        case 'Thứ Sáu':
            return 5;

        case 'Thứ Bảy':
            return 6;

        default:
        case 'Chủ Nhật':
            return 0;
    }
}
