export const REGIONS = [
  { code: '11', name: '서울' }, { code: '21', name: '부산' }, { code: '22', name: '대구' },
  { code: '23', name: '인천' }, { code: '24', name: '광주' }, { code: '25', name: '대전' },
  { code: '26', name: '울산' }, { code: '29', name: '세종' }, { code: '31', name: '경기' },
  { code: '32', name: '강원' }, { code: '33', name: '충북' }, { code: '34', name: '충남' },
  { code: '35', name: '전북' }, { code: '36', name: '전남' }, { code: '37', name: '경북' },
  { code: '38', name: '경남' }, { code: '39', name: '제주' }
];

export const SUB_REGIONS: Record<string, { code: string; name: string }[]> = {
  '31': [
    { code: '', name: '전체' },
    { code: '31011', name: '수원시 장안구' }, { code: '31012', name: '수원시 권선구' }, { code: '31013', name: '수원시 팔달구' }, { code: '31014', name: '수원시 영통구' },
    { code: '31021', name: '성남시 수정구' }, { code: '31022', name: '성남시 중원구' }, { code: '31023', name: '성남시 분당구' },
    { code: '31030', name: '의정부시' }, { code: '31041', name: '안양시 만안구' }, { code: '31042', name: '안양시 동안구' },
    { code: '31050', name: '부천시' }, { code: '31060', name: '광명시' }, { code: '31070', name: '평택시' }, { code: '31080', name: '동두천시' },
    { code: '31091', name: '안산시 상록구' }, { code: '31092', name: '안산시 단원구' }, { code: '31101', name: '고양시 덕양구' }, { code: '31103', name: '고양시 일산동구' }, { code: '31104', name: '고양시 일산서구' },
    { code: '31110', name: '용인시 처인구' }, { code: '31111', name: '용인시 기흥구' }, { code: '31112', name: '용인시 수지구' },
    { code: '31120', name: '구리시' }, { code: '31130', name: '남양주시' }, { code: '31140', name: '오산시' }, { code: '31150', name: '시흥시' },
    { code: '31160', name: '군포시' }, { code: '31170', name: '의왕시' }, { code: '31180', name: '하남시' }, { code: '31190', name: '파주시' },
    { code: '31200', name: '이천시' }, { code: '31210', name: '안성시' }, { code: '31220', name: '김포시' }, { code: '31230', name: '화성시' },
    { code: '31240', name: '광주시' }, { code: '31250', name: '양주시' }, { code: '31260', name: '포천시' }, { code: '31270', name: '여주시' },
    { code: '31280', name: '연천군' }, { code: '31290', name: '가평군' }, { code: '31300', name: '양평군' }
  ],
  '11': [
    { code: '', name: '전체' },
    { code: '11230', name: '강남구' }, { code: '11240', name: '송파구' }, { code: '11250', name: '강동구' },
    { code: '11140', name: '마포구' }, { code: '11110', name: '노원구' }, { code: '11010', name: '종로구' },
    { code: '11190', name: '영등포구' }, { code: '11200', name: '동작구' }, { code: '11210', name: '관악구' },
    { code: '11020', name: '중구' }, { code: '11030', name: '용산구' }, { code: '11040', name: '성동구' },
    { code: '11050', name: '광진구' }, { code: '11060', name: '동대문구' }, { code: '11070', name: '중랑구' },
    { code: '11080', name: '성북구' }, { code: '11090', name: '강북구' }, { code: '11100', name: '도봉구' }
  ],
  '21': [
    { code: '', name: '전체' },
    { code: '21010', name: '중구' }, { code: '21020', name: '서구' }, { code: '21030', name: '동구' }, { code: '21040', name: '영도구' },
    { code: '21050', name: '동래구' }, { code: '21060', name: '남구' }, { code: '21070', name: '북구' }, { code: '21080', name: '해운대구' },
    { code: '21090', name: '사하구' }, { code: '21100', name: '금정구' }, { code: '21110', name: '강서구' }, { code: '21120', name: '연제구' }, { code: '21130', name: '수영구' }, { code: '21140', name: '사상구' }, { code: '21310', name: '기장군' }
  ],
  '22': [
    { code: '', name: '전체' },
    { code: '22010', name: '중구' }, { code: '22020', name: '동구' }, { code: '22030', name: '서구' }, { code: '22040', name: '남구' },
    { code: '22050', name: '북구' }, { code: '22060', name: '수성구' }, { code: '22070', name: '달서구' }, { code: '22310', name: '달성군' }
  ],
  '23': [
    { code: '', name: '전체' },
    { code: '23010', name: '중구' }, { code: '23020', name: '동구' }, { code: '23040', name: '연수구' }, { code: '23050', name: '남동구' },
    { code: '23060', name: '부평구' }, { code: '23070', name: '계양구' }, { code: '23080', name: '서구' }, { code: '23310', name: '강화군' }, { code: '23320', name: '옹진군' }
  ],
  '24': [
    { code: '', name: '전체' },
    { code: '24010', name: '동구' }, { code: '24020', name: '서구' }, { code: '24030', name: '남구' }, { code: '24040', name: '북구' }, { code: '24050', name: '광산구' }
  ],
  '25': [
    { code: '', name: '전체' },
    { code: '25010', name: '동구' }, { code: '25020', name: '중구' }, { code: '25030', name: '서구' }, { code: '25040', name: '유성구' }, { code: '25050', name: '대덕구' }
  ],
  '26': [
    { code: '', name: '전체' },
    { code: '26010', name: '중구' }, { code: '26020', name: '남구' }, { code: '26030', name: '동구' }, { code: '26040', name: '북구' }, { code: '26310', name: '울주군' }
  ],
  '29': [
    { code: '', name: '전체' },
    { code: '29010', name: '세종시' }
  ],
  '32': [
    { code: '', name: '전체' },
    { code: '32010', name: '춘천시' }, { code: '32020', name: '원주시' }, { code: '32030', name: '강릉시' }, { code: '32040', name: '동해시' },
    { code: '32050', name: '태백시' }, { code: '32060', name: '속초시' }, { code: '32070', name: '삼척시' }
  ],
  '33': [
    { code: '', name: '전체' },
    { code: '33011', name: '청주시 상당구' }, { code: '33012', name: '청주시 서원구' }, { code: '33013', name: '청주시 흥덕구' }, { code: '33014', name: '청주시 청원구' },
    { code: '33020', name: '충주시' }, { code: '33030', name: '제천시' }
  ],
  '34': [
    { code: '', name: '전체' },
    { code: '34011', name: '천안시 동남구' }, { code: '34012', name: '천안시 서북구' },
    { code: '34020', name: '공주시' }, { code: '34030', name: '보령시' }, { code: '34040', name: '아산시' }
  ],
  '35': [
    { code: '', name: '전체' },
    { code: '35011', name: '전주시 완산구' }, { code: '35012', name: '전주시 덕진구' },
    { code: '35020', name: '군산시' }, { code: '35030', name: '익산시' }
  ],
  '36': [
    { code: '', name: '전체' },
    { code: '36010', name: '목포시' }, { code: '36020', name: '여수시' }, { code: '36030', name: '순천시' }, { code: '36040', name: '나주시' }, { code: '36060', name: '광양시' }
  ],
  '37': [
    { code: '', name: '전체' },
    { code: '37011', name: '포항시 남구' }, { code: '37012', name: '포항시 북구' },
    { code: '37020', name: '경주시' }, { code: '37030', name: '김천시' }, { code: '37040', name: '안동시' }, { code: '37050', name: '구미시' }, { code: '37060', name: '영주시' }, { code: '37070', name: '영천시' }, { code: '37080', name: '상주시' }, { code: '37090', name: '문경시' }, { code: '37100', name: '경산시' }
  ],
  '38': [
    { code: '', name: '전체' },
    { code: '38111', name: '창원시 의창구' }, { code: '38112', name: '창원시 성산구' }, { code: '38113', name: '창원시 마산합포구' }, { code: '38114', name: '창원시 마산회원구' }, { code: '38115', name: '창원시 진해구' },
    { code: '38030', name: '진주시' }, { code: '38050', name: '통영시' }, { code: '38070', name: '사천시' }, { code: '38080', name: '김해시' }, { code: '38090', name: '밀양시' }, { code: '38100', name: '거제시' }, { code: '38110', name: '양산시' }
  ],
  '39': [
    { code: '', name: '전체' },
    { code: '39010', name: '제주시' }, { code: '39020', name: '서귀포시' }
  ]
};
